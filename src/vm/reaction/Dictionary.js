import { Observer } from "../Observer";
import { Model } from "../Model";
import { updateRefs } from "../methods/updateRefs";
import { enqueueUpdate } from "../methods/enqueueUpdate";
import { isObservable } from "../predicates";
import { disconnect, connect, freezeObject } from "../methods/connect";
import { getRelObserverOrSelf } from "../methods/getRelObserver";
import { SymbolFrom } from "../symbols";
import { reactTo } from "./Reaction";

const hasOwnProperty = Object.prototype.hasOwnProperty;
const MARK_SWEEP = Symbol('mark and sweep');

function emitChanges(changes) {
    freezeObject(this.state.data, this);
    enqueueUpdate(this);
    updateRefs(this);

    if (this.state.hasOnAttrChangeListener && changes.length) {
        for (var i = 0, length = changes.length; i < length; i += 3) {
            this.trigger("change:" + changes[i], changes[i + 1], changes[i + 2]);
        }
    }
    this.state.changed = true;
}

function addChange(attributes, key, value, originValue, changes) {
    changes.push(key, value, originValue);

    if (value) {
        const observer = getRelObserverOrSelf(value);
        if (isObservable(observer)) {
            if (isObservable(originValue)) {
                disconnect(this, originValue);
            }
            connect(this, observer, key);
        }
    }

    attributes[key] = value;
}

export class Dictionary extends Observer {
    static isDictionary = (dictionary) => {
        return dictionary instanceof Dictionary;
    }

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
            if (key === '__proto__' || key === 'withMutations' || key === SymbolFrom) {
                continue;
            }

            const value = data[key];
            const originValue = oldAttributes[key];

            if (value === MARK_SWEEP) {
                changes.push(key, undefined, attributes[key]);

                if (isObservable(originValue)) {
                    disconnect(this, originValue);
                }
            } else if (originValue !== value) {
                addChange.call(this, attributes, key, value, originValue, changes);
            }
        }

        this.state.setting = false;

        emitChanges.call(this, changes);

        return this;
    }

    set(data) {
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
                const originValue = attributes[key];

                if (originValue !== value) {
                    addChange.call(this, attributes, key, value, originValue, changes);
                }
            }
        }
        state.setting = false;

        emitChanges.call(this, changes);

        return this;
    }

    get(key) {
        reactTo(this, key);

        if (key == null) return this.state.data;
        return this.state.data[key];
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
