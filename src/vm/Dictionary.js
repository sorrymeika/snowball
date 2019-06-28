import { Observer } from "./Observer";
import { Model } from "./Model";
import { Collection } from "./Collection";
import { updateRefs } from "./methods/updateRefs";
import { enqueueUpdate } from "./methods/enqueueUpdate";
import { isObservable } from "./predicates";
import { disconnect, connect, addSymbolObserver } from "./methods/connect";
import { SymbolObserver } from "./symbols";

const hasOwnProperty = Object.prototype.hasOwnProperty;
const MARK_SWEEP = Symbol('mark and sweep');

function emitChanges(changes) {
    enqueueUpdate(this);
    updateRefs(this);

    if (this.state.hasOnChangeListener && changes.length) {
        for (var i = 0, length = changes.length; i < length; i += 3) {
            this.trigger("change:" + changes[i], changes[i + 1], changes[i + 2]);
        }
    }
    this.state.changed = true;
    addSymbolObserver(this.state.data, this);
    Object.freeze(this.state.data);
}

function addChange(attributes, key, value, originValue, changes) {
    changes.push(key, value, originValue);

    if (value) {
        const observable = value[SymbolObserver] || value;
        if (isObservable(observable)) {
            if (isObservable(originValue)) {
                disconnect(this, originValue);
            }
            connect(this, observable, key);
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
        }
        this.state.initialized = true;
    }

    renew(data) {
        const oldAttributes = this.state.data;
        const attributes = this.state.data = {};
        const changes = [];

        data = {
            ...data
        };

        for (let key in oldAttributes) {
            if (!hasOwnProperty.call(data, key)) {
                data[key] = MARK_SWEEP;
            }
        }

        for (let key in data) {
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

        emitChanges.call(this, changes);

        return this;
    }

    set(data) {
        const { state } = this;
        const attributes = this.state.data = {
            ...state.data
        };
        const changes = [];

        for (let key in data) {
            if (hasOwnProperty.call(data, key)) {
                const value = data[key];
                const originValue = attributes[key];

                if (originValue !== value) {
                    addChange.call(this, attributes, key, value, originValue, changes);
                }
            }
        }

        emitChanges.call(this, changes);

        return this;
    }

    destroy() {
        super.destroy();

        if (this.state) {
            const { data } = this.state;
            for (let key in data) {
                const value = data[key];
                if (value) {
                    const observable = value[SymbolObserver] || value;
                    if (isObservable(observable)) {
                        disconnect(this, observable);
                    }
                }
            }
            this.state = null;
        }
    }
}

Dictionary.prototype.on = Model.prototype.on;
Dictionary.prototype.get = Model.prototype.get;
Dictionary.prototype.observe = Model.prototype.observe;
Dictionary.prototype.unobserve = Model.prototype.unobserve;
Dictionary.prototype.compute = Model.prototype.compute;

export class DictionaryList extends Collection {
    static createItem(data, index, parent) {
        return new Dictionary(data, index, parent);
    }
}