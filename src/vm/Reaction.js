import { isModel } from "./predicates";

let currentReaction;

export function reactTo(model, name) {
    if (currentReaction) {
        put.call(currentReaction, model, name);
    }
}

function put(model, name) {
    const id = model.state.id + ':' + name;
    const value = model.state.observableProps[name];
    const onlyOnChange = !value || isModel(value);

    let dispose = this._disposers[id];
    if (!dispose) {
        observe.call(this, model, name, id, onlyOnChange);
        this._disposerKeys.push(id);
    } else if (dispose.onlyOnChange != onlyOnChange) {
        dispose();
        observe.call(this, model, name, id, onlyOnChange);
    }

    this._disposers[id].onlyOnChange = onlyOnChange;
    this._marks[id] = true;
}

function observe(model, name, id, onlyOnChange) {
    if (!onlyOnChange) {
        this._disposers[id] = () => model.unobserve(name, this.emit);
        model.observe(name, this.emit);
    } else {
        this._disposers[id] = () => model.off('change:' + name, this.emit);
        model.on('change:' + name, this.emit);
    }
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

export function autorun(fn) {
    const reaction = new Reaction(() => {
        reaction.track(fn);
    });
    reaction.track(fn);
    return () => reaction.destroy();
}