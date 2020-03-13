import { debounce, throttle, isFunction, isThenable } from "../utils";
import { isObservable } from "./predicates";

function flow(stream, fn) {
    return new Stream((iterator) => {
        return stream.observe((data) => {
            fn(data, iterator.next, iterator.complete);
        }, iterator.complete);
    });
}

class Iterator {
    constructor(eachFn) {
        this._done = false;
        this._each = eachFn;
    }

    next(value) {
        if (this._done) throw new Error('Iterator is complete!');
        this._each(value);
    }

    complete() {
        if (this._done) return;
        this._prev && (this._prev._next = this._next);
        this._next && (this._next._prev = this._prev);
        this._done = true;
        this._onComplete && this._onComplete();
        this._despose && this._despose();
    }
}

class Stream {
    constructor(subscribe) {
        this._subscribe = subscribe;
        const iterator = this._iterator = {};
        iterator._next = iterator;
        iterator._prev = iterator;
    }

    filter(fn) {
        return flow(this, (data, next) => fn(data) && next(data));
    }

    map(fn) {
        return flow(this, (data, next) => next(fn(data)));
    }

    delay(time) {
        return flow(this, (data, next) => setTimeout(() => next(data), time));
    }

    debounceTime(time) {
        return flow(this, (data, next) => debounce(() => next(data), time));
    }

    throttleTime(time) {
        return flow(this, (data, next) => throttle(() => next(data), time));
    }

    observe(fn, complete?) {
        const iterator = new Iterator(fn);
        const currentIterator = this._iterator;
        iterator._prev = currentIterator._prev;
        iterator._next = currentIterator;
        currentIterator._prev._next = iterator;
        currentIterator._prev = iterator;

        iterator._onComplete = complete;
        iterator._despose = this._subscribe({
            next(data) {
                iterator.next(data);
            },
            complete() {
                iterator.complete();
            }
        });
        return () => iterator.complete();
    }

    toPromise() {
        return new Promise((resolve) => {
            const despose = this.observe((value) => {
                resolve(value);
                despose();
            });
        });
    }

    unobserve() {
        let first = this._iterator;
        let iterator = first._next;
        while (iterator && iterator != first) {
            console.log(iterator);
            iterator.complete();
            iterator = first._next;
        }
    }
}

function fromPromise(promise) {
    return new Stream(({ next, complete }) => {
        promise.then((data) => {
            next(data);
            complete();
        });
    });
}

function fromObservable(obs) {
    return new Stream(({ next, complete }) => {
        next(obs.get());
        obs.on('destroy', complete);
        return obs.observe(next);
    });
}

function fromArray(array) {
    return new Stream(({ next, complete }) => {
        array.forEach(next);
        complete();
    });
}

function of(...args) {
    return fromArray(args);
}

export const StreamUtils = {
    from: fromArray,
    fromPromise,
    fromObservable,
    of
};

export default function stream(val) {
    return isFunction(val)
        ? new Stream(val)
        : isObservable(val)
            ? fromObservable(val)
            : Array.isArray(val)
                ? fromArray(val)
                : isThenable(val)
                    ? fromPromise(val)
                    : new Stream(({ next, complete }) => {
                        next(val);
                        complete();
                    });
}

if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
        const { Model } = require('./');

        stream(['asf', 1, 2])
            .observe((a) => {
                console.log(a);
            });

        const model = new Model({
            id: 1
        });

        var flow = stream(model);
        var mapFlow = flow.map(a => a.id + 1);
        mapFlow.observe((val) => {
            console.log(val);
        });
        console.log(flow, mapFlow);

        setTimeout(() => {
            flow.unobserve();
            console.log(flow, mapFlow);
        });
    });
}