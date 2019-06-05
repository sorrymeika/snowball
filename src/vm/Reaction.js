let currentReaction;

export function reactTo(model, path) {
    if (currentReaction) {
        put.call(currentReaction, model, path);
    }
}

function put(model, path) {
    const id = model.state.id + ':' + path;
    if (!this._disposers[id]) {
        this._disposers[id] = () => model.unobserve(path, this.emit);
        this._disposerKeys.push(id);
        model.observe(path, this.emit);
    }
    this._marks[id] = true;
}

const resolvedPromise = Promise.resolve();

/**
 * @example
 * const reaction = new Reaction(() => {
 * console.log(123);
 * });
 * reaction.track(()=>{
 *   user.name = 1;
 * })
 * reaction.observe(()=>alert(1))
 * reaction.destroy();
 */
export class Reaction {
    constructor(func) {
        const funcs = [func];
        let emitted = false;
        this.emit = () => {
            if (!emitted) {
                emitted = true;
                resolvedPromise.then(() => {
                    emitted = false;
                    for (let i = 0; i < funcs.length; i++) {
                        funcs[i]();
                    }
                });
            }
        };
        this._disposers = {};
        this._disposerKeys = [];
        this._funcs = funcs;
    }

    track(func) {
        this._marks = {};

        currentReaction = this;
        func();
        currentReaction = null;

        const disposers = this._disposers;
        const marks = this._marks;
        const keys = this._disposerKeys;
        const newKeys = [];
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (!marks[key]) {
                delete disposers[key];
            } else {
                newKeys.push(key);
            }
        }
        this._disposerKeys = newKeys;
    }

    observe(fn) {
        this._funcs.push(fn);
    }

    destroy() {
        if (!this.isDestroyed) {
            this.isDestroyed = true;
            const keys = this._disposerKeys;
            for (let i = 0; i < keys.length; i++) {
                this._disposers[keys[i]]();
            }
            this._disposers = null;
            this._disposerKeys = null;
        }
    }
}
