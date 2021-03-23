import { Observer } from "./Observer";
import { Model } from "./Model";
import { updateRefs } from "../methods/updateRefs";
import { enqueueUpdate } from "../methods/enqueueUpdate";
import { isObservable, TYPEOF } from "../predicates";
import { disconnect, connect, freezeObject } from "../methods/connect";
import { getRelObserverOrSelf } from "../methods/getRelObserver";
import { SymbolFrom } from "../symbols";
import { isPlainObject, isArray } from "../../utils";

const hasOwnProperty = Object.prototype.hasOwnProperty;
const MARK_SWEEP = Symbol('mark and sweep');

export class Dictionary extends Observer {

    constructor(data, key?, parent?) {
        super(undefined, key, parent);

        this.state.data = {};
        this.state.initialized = false;
        if (data) {
            this.set(data);
        } else {
            freezeObject(this.state.data, this);
        }
        this.state.initialized = true;
    }

    renew(data) {
        const oldAttributes = this.state.data;
        const attributes = this.state.data = {};
        const changes = [];

        data = Object.assign({}, data);

        for (let key in oldAttributes) {
            if (!hasOwnProperty.call(data, key)) {
                data[key] = MARK_SWEEP;
            }
        }
        this.state.setting = true;

        for (let key in data) {
            if (key === 'constructor' && typeof data[key] === 'function') {
                continue;
            }
            if (key === '__proto__' || key === SymbolFrom) {
                continue;
            }

            const value = data[key];
            const oldValue = oldAttributes[key];

            if (value === MARK_SWEEP) {
                changes.push(key, undefined, attributes[key]);
                if (isObservable(oldValue)) {
                    disconnect(this, oldValue);
                }
            } else if (oldValue !== value) {
                updateDictionary(this, attributes, key, value, oldValue, changes);
            } else {
                attributes[key] = value;
            }
        }

        this.state.setting = false;
        emitChanges(this, changes);

        return this;
    }

    set(key, val) {
        let data;
        if (typeof key === 'boolean') {
            if (key) {
                return this.renew(val);
            }
            data = val;
        } else {
            data = arguments.length == 2 ? { [key]: val } : key;
        }

        const { state } = this;
        const attributes = this.state.data = Object.assign({}, state.data);
        const changes = [];

        state.setting = true;
        for (let key in data) {
            if (key === 'constructor' && typeof data[key] === 'function') {
                continue;
            }
            if (key === '__proto__') {
                continue;
            }
            if (hasOwnProperty.call(data, key)) {
                const value = data[key];
                const oldValue = attributes[key];

                if (oldValue !== value) {
                    updateDictionary(this, attributes, key, value, oldValue, changes);
                }
            }
        }
        state.setting = false;

        emitChanges(this, changes);

        return this;
    }

    keys() {
        return Object.keys(this.state.data);
    }

    has(key) {
        return key in this.state.data;
    }

    delete(key) {
        const { state } = this;
        const { data } = state;

        key = '' + key;
        if (key in data) {
            const oldValue = data[key];
            const newData = {};
            for (let attrName in data) {
                if (key !== attrName) {
                    newData[key] = data[attrName];
                }
            }
            state.data = newData;

            if (oldValue !== undefined) {
                emitChanges(this, [key, undefined, oldValue]);
            }
            return true;
        }
        return false;
    }

    destroy() {
        super.destroy();

        if (this.state) {
            const { data } = this.state;
            for (let key in data) {
                const value = data[key];
                if (value) {
                    const observer = getRelObserverOrSelf(value);
                    if (isObservable(observer)) {
                        disconnect(this, observer);
                    }
                }
            }
            this.state = null;
        }
    }
}

Dictionary.prototype.on = Model.prototype.on;
Dictionary.prototype.off = Model.prototype.off;
Dictionary.prototype.observe = Model.prototype.observe;
Dictionary.prototype.unobserve = Model.prototype.unobserve;
Dictionary.prototype.compute = Model.prototype.compute;

Dictionary.prototype[TYPEOF] = 'Dictionary';

function updateDictionary(dictionary, attributes, key, value, oldValue, changes) {
    changes.push(key, value, oldValue);
    attributes[key] = value;

    if (value) {
        const observer = getRelObserverOrSelf(value);
        if (isObservable(observer)) {
            if (isObservable(oldValue)) {
                disconnect(dictionary, oldValue);
            }
            connect(dictionary, observer, key);
            attributes[key] = observer.get();
        } else {
            if (process.env.NODE_ENV !== 'production') {
                if (isPlainObject(value) || isArray(value)) {
                    Object.freeze(value);
                }
            }
        }
    }
}

function emitChanges(dictionary, changes) {
    freezeObject(dictionary.state.data, dictionary);
    enqueueUpdate(dictionary);
    updateRefs(dictionary);

    if (dictionary.state.hasOnAttrChangeListener && changes.length) {
        for (var i = 0, length = changes.length; i < length; i += 3) {
            dictionary.trigger("change:" + changes[i], changes[i + 1], changes[i + 2]);
        }
    }
    dictionary.state.changed = true;
}
