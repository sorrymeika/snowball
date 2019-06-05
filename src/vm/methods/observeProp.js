import { IObservable, Observer } from "../Observer";

class ChangeObserver implements IObservable {
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

export function observeProp(observer, name, fn) {
    if (!fn) {
        return new ChangeObserver(observer, name);
    } else {
        const cb = () => fn.call(observer, observer.get());
        cb._cb = fn;
        return observer.on(castEvents(name), cb);
    }
}

export function unobserveProp(observer, name, fn) {
    return observer.off(castEvents(name), fn);
}

function castEvents(propNames) {
    return 'datachanged' + (
        propNames
            ? propNames
                .split(/\s+/)
                .filter(name => !!name)
                .map(name => ':' + name.replace(/\./g, '/'))
                .join(' datachanged')
            : ''
    );
}