import { isObservable } from "./predicates";
import { defer } from "./methods/enqueueUpdate";

let currentReaction;

export function reactTo(model, name) {
    if (currentReaction) {
        put.call(currentReaction, model, name);
    }
}

function put(model, name) {
    const id = model.state.id + ':' + name;
    const value = model.state.observableProps[name];
    const oldDispose = this._disposers[id];
    const deepChange = value && isObservable(value) && !value.state.facade;

    if (!oldDispose) {
        observe.call(this, model, name, id, deepChange, value);
        this._disposerKeys.push(id);
    } else if (oldDispose.deepChange != deepChange || (deepChange && oldDispose.deepChange && oldDispose.emit.childModel != value)) {
        oldDispose.disposeValueChange();
        if (deepChange) {
            oldDispose.emit.childModel = value;
            value.on('change', oldDispose.emit);
        }
    }

    this._marks[id] = true;
}

function observe(model, name, id, deepChange, value) {
    const emit = () => {
        this.emit();
    };

    const dispose = () => {
        model.off('change:' + name, emit);
        emit.childModel && emit.childModel.off('change', emit);
    };

    if (deepChange) {
        emit.childModel = value;
        value.on('change', emit);
    } else {
        emit.childModel = null;
    }
    dispose.disposeValueChange = () => {
        emit.childModel && emit.childModel.off('change', emit);
    };
    dispose.emit = emit;
    dispose.deepChange = deepChange;

    this._disposers[id] = dispose;
    model.on('change:' + name, emit);
}

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
    constructor(func, immediate) {
        const funcs = [func];
        if (immediate) {
            this.emit = () => {
                for (let i = 0; i < funcs.length; i++) {
                    funcs[i]();
                }
            };
        } else {
            let emitted = false;
            this.emit = () => {
                if (!emitted) {
                    emitted = true;
                    defer(() => {
                        emitted = false;
                        for (let i = 0; i < funcs.length; i++) {
                            funcs[i]();
                        }
                    });
                }
            };
        }
        this._disposers = {};
        this._disposerKeys = [];
        this._funcs = funcs;
    }

    track(func) {
        this._marks = {};

        const lastReaction = currentReaction;
        currentReaction = this;
        func();
        currentReaction = lastReaction;

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
        return this;
    }

    observe(fn) {
        this._funcs.push(fn);
        return this;
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