import { defer } from "./methods/enqueueUpdate";
import { getMemberName } from "./methods/connect";

let currentReaction;

export function reactTo(model, name) {
    if (currentReaction) {
        currentReaction._push(model, name);
    }
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

    _push(model, name) {
        this._array.push([model, name]);
    }

    _observe(model, name) {
        const id = model.state.id + (name != null ? ':' + name : '');
        const oldDispose = this._disposers[id];

        if (!oldDispose) {
            const eventName = name != null ? 'change:' + name : 'change';
            const emit = () => {
                if (currentReaction != this) {
                    this.emit();
                } else {
                    console.warn('it will not emit when changes caused in reaction.track!');
                }
            };
            const dispose = () => {
                model.off(eventName, emit);
            };
            dispose.emit = emit;

            this._disposers[id] = dispose;
            model.on(eventName, emit);
            this._disposerKeys.push(id);
        }

        this._marks[id] = true;
    }

    track(func) {
        this._marks = {};
        this._array = [];

        const lastReaction = currentReaction;
        currentReaction = this;
        func();
        currentReaction = lastReaction;

        this._array.push(null);
        this._array.reduce((prev, current) => {
            if (prev) {
                const [prevModel, prevName] = prev;
                if (!current || getMemberName(prevModel, current[0]) !== prevName) {
                    this._observe(prevModel, prevName);
                }
            }
            return current;
        }, null);
        this._array = null;

        const disposers = this._disposers;
        const marks = this._marks;
        const keys = this._disposerKeys;
        const newKeys = [];
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (!marks[key]) {
                disposers[key]();
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


// Reaction test
if (process.env.NODE_ENV === 'development') {

    // observable object test
    setTimeout(() => {
        const { observable } = require('./observable');

        class B {
            @observable
            name = 1;

            @observable
            id = 1;
        }

        class A {
            @observable
            name = 1;

            @observable
            data = {}

            @observable
            b;
        }

        let a = new A();
        let b = new B();
        let count = -1;
        let tmp = {};

        const reaction = new Reaction(() => {
            count++;

            switch (count) {
                case 0:
                    console.assert(a.name == 2, 'a.name must be 2!');
                    break;
                case 1:
                    console.assert(a.data.name == 1, 'a.data.name must be 1!');
                    break;
                case 2:
                    console.assert(a.data.name == 2, 'a.data.name must be 2!');
                    break;
                case 3:
                    console.assert(a.b.name == 1, 'a.b.name must be 1!');
                    break;
                case 4:
                    console.assert(a.b.name == 2, 'a.b.name must be 2!');
                    break;
                case 5:
                    console.assert(a.b.name == 3, 'a.b.name must be 3!');
                    break;
            }
        }, true);

        reaction.track(() => {
            tmp.name = a.name;
        });
        console.assert(tmp.name == 1, 'tmp.name must be 1!');

        a.name = 2;
        console.assert(count == 0, 'reaction is not emit!');

        reaction.track(() => {
            tmp.data = a.data;
        });

        a.data = {
            name: 1
        };
        console.assert(count == 1, 'set a.data then reaction is not emit!');

        a.data.withMutations((data) => {
            data.set({
                name: 2
            });
        });
        console.assert(count == 2, 'set a.data then reaction is not emit!');

        a.name = 'cctv';
        console.assert(count == 2, 'reaction can not emit when other props change!');

        reaction.track(() => {
            tmp.b = a.b;
        });

        a.b = b;
        console.assert(count == 3, 'a.b = b; not emit!!');

        // 监听observable object属性的属性
        reaction.track(() => {
            tmp.name = a.b.name;
        });
        a.b.name = 2;
        console.assert(count == 4, 'a.b.name = 2; not emit!!');

        a.b.id = 2;
        console.assert(count == 4, 'a.b.id = 2; can not emit reaction!!');

        // 监听observable object属性
        reaction.track(() => {
            tmp.b = a.b;
        });
        a.b.name = 3;
        console.assert(count == 5, 'a.b.name = 2; not emit!!');
    });


    // dictionary reaction test
    setTimeout(() => {
        const { Dictionary } = require('./objects/Dictionary');

        let a = new Dictionary({
            name: 1
        });

        let count = -1;
        let tmp = {};

        const reaction = new Reaction(() => {
            count++;

            switch (count) {
                case 0:
                    console.assert(a.get('name') == 2, 'a.name must be 2!');
                    break;
            }
        }, true);

        reaction.track(() => {
            tmp.name = a.get('name');
        });

        console.assert(tmp.name == 1, 'tmp.name must be 1!');

        a.set({ name: 2 });
        console.assert(count == 0, 'reaction is not emit!');

        a.set({ name: 2, id: 1 });
        console.assert(count == 0, 'id change can not emit reaction!');
        console.assert(a.get('id') == 1, 'a.id must be 1!!');

    });

    // model reaction test
    setTimeout(() => {
        const { Model } = require('./objects/Model');
        const a = new Model({
            name: 1
        });

        let count = -1;
        let tmp = {};

        const reaction = new Reaction(() => {
            count++;

            switch (count) {
                case 0:
                    console.assert(a.get('name') == 2, 'a.name must be 2!');
                    break;
                case 1:
                    console.assert(a.get('data.name') == 1, 'a.data.name must be 1!');
                    break;
            }
        }, true);

        reaction.track(() => {
            tmp.name = a.get('name');
        });

        console.assert(tmp.name == 1, 'tmp.name must be 1!');

        a.set({ name: 2 });
        console.assert(count == 0, 'reaction is not emit!');

        a.set({ name: 2, id: 1 });
        console.assert(count == 0, 'id change can not emit reaction!');
        console.assert(a.get('id') == 1, 'a.id must be 1!!');

        reaction.track(() => {
            tmp.name = a.get('data.name');
        });

        a.set({
            data: {
                name: 1
            }
        });
        console.assert(count == 1, 'set a.data.name, reaction is not emit!');
    });
}