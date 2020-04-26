import { eventMixin, Emitter } from '../../core/event';
import { identify } from '../../utils/guid';

import { TYPEOF } from '../predicates';
import { SymbolFrom } from '../symbols';

import { enqueueUpdate, nextTick, enqueueInit, defer } from '../methods/enqueueUpdate';
import { updateRefs } from '../methods/updateRefs';
import { connect, disconnect } from '../methods/connect';
import { getProperty } from '../methods/getProperty';

export interface IObservable {
    get: () => any,
    set?: () => IObservable,
    observe: (cb: (value: any) => any) => boolean,
    unobserve: (cb: (value: any) => any) => any,
    destroy: () => never,
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
        enqueueInit(this);
        if (data !== undefined) {
            this.set(data);
        }
        this.state.initialized = true;
    }

    get(path) {
        return getProperty(this, path);
    }

    at(path) {
        const val = this.get(path);
        return (val && val[SymbolFrom]) || val;
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
        const cb = (e) => fn.call(this, this.get(), e);
        cb._cb = fn;
        this.on('datachanged', cb);
        return () => this.off('datachanged', cb);
    }

    unobserve(fn) {
        return this.off('datachanged', fn);
    }

    subscribe(next, error?, complete?) {
        if (typeof next == 'object') {
            error = next.error;
            complete = next.complete;
            next = next.next;
        }
        next(this.get());
        error && this.on('error', error);
        complete && this.on('destroy', complete);
        const despose = this.observe(next);
        return () => {
            error && this.off('error', error);
            complete && this.off('destroy', complete);
            despose();
        };
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
            this.on = this.set = this.get = () => {
                throw new Error('observer is destroyed');
            };
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

const off = Observer.prototype.off;
Observer.prototype.off = function (type, fn) {
    off.call(this, type, fn);

    if (!this.__events || !this.__events['change'] || this.__events['change'].length == 0) {
        this.state.hasOnChangeListener = false;
    }

    return this;
};

Observer.prototype[TYPEOF] = 'Observer';

export function readonlyObserver(observer) {
    const set = observer.set.bind(observer);
    if (process.env.NODE_ENV === 'production') {
        observer.set = undefined;
    } else {
        Object.defineProperty(observer, 'set', {
            enumerable: false,
            writable: false,
            value: function (val) {
                throw new Error('can not set readonly observer!');
            }
        });
    }
    return [observer, set];
}

export class PropObserver implements IObservable {
    constructor(observer, name) {
        this.state = { updated: observer.updated };
        this.observer = observer;
        this.name = name;
        this.callbacks = [];
        this.desposer = Emitter.create();
    }

    get() {
        return this.observer.get(this.name);
    }

    subscribe(next, error?, complete?) {
        if (typeof next == 'object') {
            error = next.error;
            complete = next.complete;
            next = next.next;
        }
        next(this.get());
        complete && this.desposer.on(complete);
        const despose = this.observe(next);
        return () => {
            complete && this.desposer.off(complete);
            despose();
        };
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

    destroy() {
        const callbacks = this.callbacks;
        for (var i = callbacks.length - 1; i >= 0; i--) {
            this.observer.unobserve(this.name, callbacks[i]);
        }
        this.desposer.emit();
        this.desposer.off();
        this.observer = this.callbacks = this.desposer = null;
    }
}

PropObserver.prototype[TYPEOF] = 'PropObserver';

export class State extends Observer {
    /**
     * 异步设置数据
     * 无论设置数据和老数据是否相同，都会触发数据变更事件
     * @param {any} data 数据
     */
    set(data) {
        if (this.state.next) {
            return this.state.next = this.state.next.then(() => this.set(data));
        }

        Observer.prototype.set.call(this, data);

        const newData = this.state.data;
        enqueueUpdate(this);

        return this.state.next = defer(() => newData);
    }
}
State.prototype[TYPEOF] = 'State';

export class Frame extends Observer {
    /**
     * 异步设置数据，本桢渲染完成才会触发下一次
     * 无论设置数据和老数据是否相同，都会触发数据变更事件
     * @param {any} data 数据
     */
    set(data) {
        return new Promise((done) => {
            this.state.next = (this.state.next || Promise.resolve()).then(() => {
                return new Promise((resolve) => {
                    nextTick(() => {
                        Observer.prototype.set.call(this, data);
                        const newData = this.state.data;
                        enqueueUpdate(this);
                        resolve();
                        nextTick(() => done(newData));
                    });
                });
            });
        });
    }
}
Frame.prototype[TYPEOF] = 'Frame';