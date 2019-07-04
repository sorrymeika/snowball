import { eventMixin } from '../core/event';
import { get } from '../utils/object';
import { identify } from '../utils/guid';

import { enqueueUpdate, nextTick, enqueueInit, emitUpdate } from './methods/enqueueUpdate';
import { updateRefs } from './methods/updateRefs';
import { connect, disconnect } from './methods/connect';
import compute from './operators/compute';
import { TYPEOF } from './predicates';


export interface IObservable {
    get: () => any,
    observe: (cb: (value: any) => any) => boolean,
    unobserve: (cb: (value: any) => any) => any,
    destroy: () => never,
    compute: (fn: (value: any) => any) => IObservable,
    state: {
        updated: boolean
    }
}

/**
 * 可观察对象，new之后不会触发observe，每次set若数据变更会触发observe
 */
export class Observer implements IObservable {

    constructor(data, key?, parent?) {
        this.state = {
            initialized: false,
            id: identify(),
            version: 0,
            mapper: {},
            changed: false,
            dirty: false,
            updated: false,
            data: undefined
        };
        if (parent) {
            connect(parent, this, key);
        }
        this.render = this.render.bind(this);
        enqueueInit(this);
        if (data !== undefined) {
            this.set(data);
        }
        this.state.initialized = true;
    }

    get(keys) {
        return keys != null ? get(this.state.data, keys) : this.state.data;
    }

    set(data) {
        if (this.state.changed = (this.state.data !== data)) {
            this.state.data = data;
            enqueueUpdate(this);
            updateRefs(this);
        } else {
            this.state.version++;
        }
        return this;
    }

    observe(fn) {
        const cb = () => fn.call(this, this.get());
        cb._cb = fn;
        this.on('datachanged', cb);
        return () => this.off('datachanged', fn);
    }

    unobserve(fn) {
        return this.off('datachanged', fn);
    }

    compute(cacl) {
        const computed = compute(this.get(), (cb) => {
            this.observe(cb);
            return () => this.unobserve(cb);
        }, cacl);
        this.on('destroy', () => computed.destroy());
        return computed;
    }

    contains(observer) {
        if (observer === this) return false;
        for (var parents = observer.state.parents; parents; parents = parent.state.parents) {
            if (parents.indexOf(this) !== -1) return true;
        }
        return false;
    }

    nextTick(cb) {
        nextTick(cb);
        return this;
    }

    valueOf() {
        return this.get();
    }

    toString() {
        return this.get() + '';
    }

    render() {
    }

    destroy() {
        if (!this.state.isDestroyed) {
            this.state.isDestroyed = true;

            const parents = this.state.parents;
            if (parents) {
                var i = -1;
                var length = parents.length;
                while (++i < length) {
                    disconnect(parents[i], this);
                }
            }

            this.trigger('destroy')
                .off();
        }
    }
}

eventMixin(Observer);

const on = Observer.prototype.on;
Observer.prototype.on = function (type, fn) {
    if (/(^|\s)change(\s|$)/.test(type)) {
        this.state.hasOnChangeListener = true;
    }
    return on.call(this, type, fn);
};

Observer.prototype[TYPEOF] = 'Observer';


export function readonlyObserver(observer) {
    const set = observer.set.bind(observer);
    Object.defineProperty(observer, 'set', {
        writable: false,
        value: function (val) {
            throw new Error('can not set readonly observer!');
        },
        enumerable: false
    });
    return [observer, set];
}

export class ChangeObserver implements IObservable {
    constructor(observer, name) {
        this.state = { updated: observer.updated };
        this.observer = observer;
        this.name = name;
        this.callbacks = [];
    }

    get() {
        return this.observer.get(this.name);
    }

    observe(cb) {
        this.observer.observe(this.name, cb);
        this.callbacks.push(cb);
        return this;
    }

    unobserve(cb) {
        this.observer.unobserve(this.name, cb);

        const callbacks = this.callbacks;
        for (var i = callbacks.length - 1; i >= 0; i--) {
            if (callbacks[i] === cb) {
                callbacks.splice(i, 1);
            }
        }
        return this;
    }

    valueOf() {
        return this.get();
    }

    destroy() {
        const callbacks = this.callbacks;
        for (var i = callbacks.length - 1; i >= 0; i--) {
            this.observer.unobserve(this.name, callbacks[i]);
        }
        this.observer = null;
        this.callbacks = null;
    }
}

ChangeObserver.prototype.compute = Observer.prototype.compute;

ChangeObserver.prototype[TYPEOF] = 'ChangeObserver';

/**
 * 立即触发型Observer
 */
export class Emitter extends Observer {
    static isEmitter = (emitter) => {
        return emitter instanceof Emitter;
    }

    set(data) {
        if (this.state.changed = (this.state.data !== data)) {
            this.state.data = data;
            updateRefs(this);
        } else {
            this.state.version++;
        }
        if (this.state.initialized) {
            emitUpdate(this);
        }
        return this;
    }
}
