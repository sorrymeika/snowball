import { debounce, throttle, isFunction, isThenable } from "../utils";
import { isObservable } from "../vm/predicates";

const symbolEmitter = Symbol.for('snowball#Emitter');

function flow(stream, fn) {
    return new Stream((iterator) => {
        return stream.subscribe((data) => {
            fn(data, iterator.next, iterator.error, iterator.complete);
        }, iterator.error, iterator.complete);
    });
}

function batchFlow(streams, fn, beforeComplete?) {
    return new Stream((iterator) => {
        const unsubscribers = streams.map((item, i) => {
            return (typeof item.subscribe === 'function' ? item : stream(item)).subscribe((data) => {
                fn(data, i, iterator.next, iterator.error, iterator.complete);
            }, iterator.error, () => {
                try {
                    beforeComplete && beforeComplete(iterator);
                    iterator.complete();
                } catch (error) {
                    iterator.error();
                }
            });
        });
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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
        if (this._done) throw new Error('Iterator is complete!');
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

    merge(...args) {
        return merge(this, ...args);
    }

    combineLatest(...args) {
        return combineLatest(this, ...args);
    }

    forkJoin(...args) {
        return forkJoin(this, ...args);
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

    takeWhile(fn) {
        return flow(this, (data, next, error, complete) => {
            next(data);
            if (fn(data)) {
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
        if (typeof next == 'object') {
            error = fn.error;
            complete = fn.complete;
            fn = fn.next;
        }
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

function merge(...streams) {
    return batchFlow(streams, (data, i, next) => {
        next(data);
    });
}

function combineLatest(...streams) {
    let length = streams.length;
    let every = false;
    const empty = Symbol();
    const results = new Array(length).fill(empty);

    return batchFlow(streams, (data, i, next, error) => {
        results[i] = data;
        if (every || (every = results.every(item => item != empty))) {
            next(results);
        }
    });
}

function forkJoin(...streams) {
    let length = streams.length;
    const results = new Array(length);
    return batchFlow(streams, (data, i, next) => {
        results[i] = data;
    }, ({ next }) => {
        next(results);
    });
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
    return new Stream((iterator) => {
        return obs.subscribe(iterator);
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
        return () => off(next);
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
    of,
    interval(time) {
        return new Stream(({ next }) => {
            let count = 0;
            const interval = setInterval(() => {
                next(count++);
            }, time);
            return () => clearInterval(interval);
        });
    },
    timer(time) {
        return new Stream(({ next, complete }) => {
            const interval = setTimeout(() => {
                next(0);
                complete();
            }, time);
            return () => setTimeout(interval);
        });
    },
    merge,
    combineLatest,
    forkJoin,
    extend(props) {
        Object.assign(Stream.prototype, props);
    },
    flow,
    batchFlow
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
        const { Model } = require('../vm');

        let i = 0;
        let array = ['asf', 1, 2];
        stream(array)
            .subscribe((a) => {
                console.assert(a == array[i++]);
            });

        const model = new Model({
            id: 1
        });
        var flow = stream(model);
        var mapFlow = flow.map(a => a.id + 1);
        mapFlow.subscribe((val) => {
            console.assert(val == 2);
        });
    });
}