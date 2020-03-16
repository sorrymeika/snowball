import { debounce, throttle, isFunction, isThenable } from "../utils";
import { isObservable } from "./predicates";

const symbolEmitter = Symbol.for('snowball#Emitter');

function flow(stream, fn) {
    return new Stream((iterator) => {
        return stream.subscribe((data) => {
            fn(data, iterator.next, iterator.error, iterator.complete);
        }, iterator.error, iterator.complete);
    });
}

class Iterator {
    constructor(next, error, complete) {
        this._done = false;
        this._onNext = next;
        this._onError = error;
        this._onComplete = complete;
    }

    next(value) {
        if (this._done) throw new Error('Iterator is complete!');
        try {
            this._onNext(value);
        } catch (error) {
            this.error(error);
        }
    }

    error(e) {
        this._onError ? this._onError(e) : console.error(e);
        this.complete();
    }

    complete() {
        if (this._done) return;
        this._done = true;
        this._onComplete && this._onComplete();
        this._despose && this._despose();
    }
}

class Stream {
    constructor(subscribe) {
        if (subscribe) {
            this._subscribe = subscribe;
        }
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

    take(num) {
        if (num <= 0) throw new Error('take number must > 0!');
        let count = 0;
        return flow(this, (data, next, error, complete) => {
            next(data);
            count++;
            if (count >= num) {
                complete();
            }
        });
    }

    first() {
        return this.take(1);
    }

    takeUntil(stream) {
        let done = false;
        let unsubscribe = stream.subscribe(() => {
            done = true;
            unsubscribe();
        });
        return flow(this, (data, next, error, complete) => {
            next(data);
            if (done) {
                complete();
            }
        });
    }

    switchMap(fn) {
        let unsubscribe;
        return flow(this, (data, next, error, complete) => {
            unsubscribe && unsubscribe();
            let stream = fn(data);
            unsubscribe = stream.subscribe(next, error);
        });
    }

    subscribe(fn, error?, complete?) {
        const iterator = new Iterator(fn, error, complete);
        iterator._despose = this._subscribe({
            next(data) {
                iterator.next(data);
            },
            error(e) {
                iterator.error(e);
            },
            complete() {
                iterator.complete();
            }
        });
        return () => iterator.complete();
    }

    toPromise() {
        return new Promise((resolve, reject) => {
            let value;
            this.subscribe((x) => value = x, (err) => reject(err), () => resolve(value));
        });
    }
}

class Subject extends Stream {
    constructor() {
        super();

        const iterator = this._iterator = {};
        iterator._next = iterator;
        iterator._prev = iterator;
    }

    next(data) {
        this._eachIterator((iterator) => {
            iterator.next(data);
        });
    }

    error(e) {
        this._eachIterator((iterator) => {
            iterator.error(e);
        });
    }

    complete() {
        this._eachIterator((iterator) => {
            iterator.complete();
        });
        this._iterator = null;
    }

    _subscribe(iterator) {
        const currentIterator = this._iterator;
        iterator._prev = currentIterator._prev;
        iterator._next = currentIterator;
        currentIterator._prev._next = iterator;
        currentIterator._prev = iterator;

        return () => {
            iterator._prev && (iterator._prev._next = iterator._next);
            iterator._next && (iterator._next._prev = iterator._prev);
        };
    }

    _eachIterator(fn) {
        let first = this._iterator;
        let iterator = first._next;
        while (iterator && iterator != first) {
            const next = iterator._next;
            fn(iterator);
            iterator = next;
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

function fromEvent(event, type, options?) {
    return new Stream(({ next, complete }) => {
        if (event.addEventListener) {
            event.addEventListener(type, next, options);
            return () => event.removeEventListener(type, next, options);
        } else {
            event.on(type, next, options);
            return () => event.off(type, next, options);
        }
    });
}

function fromEmitter(emitter) {
    return new Stream(({ next, complete }) => {
        const off = emitter.off;
        const reset = emitter.reset;
        emitter.on(next);
        emitter.reset = () => {
            reset();
            complete();
        };
        emitter.off = (fn) => {
            off(fn);
            if (!fn || fn == next)
                complete();
        };
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
    subject: () => new Subject(),
    from: fromArray,
    fromPromise,
    fromObservable,
    fromEvent,
    fromEmitter,
    of
};

export default function stream(val) {
    return isFunction(val)
        ? val[symbolEmitter] ? fromEmitter(val) : new Stream(val)
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
            .subscribe((a) => {
                console.log(a);
            });

        const model = new Model({
            id: 1
        });

        var flow = stream(model);
        var mapFlow = flow.map(a => a.id + 1);
        mapFlow.subscribe((val) => {
            console.log(val);
        });
        console.log(flow, mapFlow);

        setTimeout(() => {
            console.log(flow, mapFlow);
        });
    });
}