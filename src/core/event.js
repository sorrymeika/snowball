function returnFalse() {
    return false;
}

function returnTrue() {
    return true;
}

export function Event(type, props) {
    props && Object.assign(this, props);
    this.type = type;

    return this;
}

Event.prototype = {
    isDefaultPrevented: returnFalse,

    isPropagationStopped: returnFalse,

    preventDefault: function () {
        this.isDefaultPrevented = returnTrue;
    },

    stopPropagation: function () {
        this.isPropagationStopped = returnTrue;
    }
};

const EventEmitterProto = {
    on(names, callback) {
        if (!callback || !names) return;

        var events = this.__events || (this.__events = {});

        names.split(/\s+/).forEach((name) => {
            if (name) {
                var type = name.toLowerCase();
                var fns = events[type] || (events[type] = []);
                fns.push(callback);
            }
        });
        return this;
    },

    onceTrue(name, callback) {
        if (!callback) return this;

        var self = this;
        function once() {
            var res = callback.apply(self, arguments);
            if (res === true)
                self.off(name, once);
            return res;
        }
        once._cb = callback;

        return this.on(name, once);
    },

    one(name, callback) {
        if (!callback) return this;

        var self = this;
        function once() {
            self.off(name, once);
            return callback.apply(self, arguments);
        }
        once._cb = callback;

        return this.on(name, once);
    },

    off(names, callback) {
        if (!this.__events) return this;

        if (!names) {
            this.__events = null;
        } else if (!callback) {
            names.split(/\s+/).forEach((name) => {
                if (name) {
                    delete this.__events[name.toLowerCase()];
                }
            });
        } else {
            names.split(/\s+/).forEach((name) => {
                if (name) {
                    var fns = this.__events[name.toLowerCase()];
                    if (fns) {
                        for (var i = fns.length - 1; i >= 0; i--) {
                            if (fns[i] === callback || fns[i]._cb === callback) {
                                fns.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            });
        }

        return this;
    },

    trigger(e, ...args) {
        if (!this.__events || !e) return this;

        var fns;
        var events = this.__events;
        var name = (typeof e === 'string' ? e : e.type).toLowerCase();
        var dotIndex;
        var len;

        while ((dotIndex = name.lastIndexOf('.')) != -1) {
            events[name] && (fns = (fns || []).concat(events[name]));
            name = name.slice(0, dotIndex);
        }
        events[name] && (fns = (fns || []).concat(events[name]));

        if (fns && (len = fns.length)) {
            var i = -1;
            var stoped;

            if (typeof e === 'string') e = new Event(e);
            else if (!(e instanceof Event)) e = new Event(e.type, e);

            if (!e.target) e.target = this;

            e.args = args;
            args.unshift(e);

            while (++i < len) {
                if ((stoped = e.isPropagationStopped()) || false === fns[i].apply(this, args)) {
                    if (!stoped) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                    break;
                }
            }
        }
        return this;
    }
};

export function EventEmitter() {
}
EventEmitter.prototype = EventEmitterProto;

export function eventMixin(fn, ext) {
    Object.assign(typeof fn == 'function' ? fn.prototype : fn, EventEmitterProto, ext);
    return fn;
}

export function createEmitter() {
    let funcs = [];
    let middlewares = [];

    const emitter = (fn) => {
        funcs.push(fn);
        return () => {
            const index = funcs.indexOf(fn);
            if (index !== -1) {
                funcs.splice(index, 1);
            }
        };
    };

    emitter.emit = (state) => {
        const event = new Event('emit');

        if (middlewares.length == 0) {
            funcs.every(nextFunc => {
                nextFunc(state, event);
                return !event.isPropagationStopped();
            });
        } else {
            let i = middlewares.length - 1;

            const next = (newState) => {
                if (i >= 0 && !event.isDefaultPrevented()) {
                    let fn = middlewares[i];
                    let called = false;
                    i--;

                    fn(newState, event, (nextState = newState) => {
                        if (called) throw new Error('next方法不可重复调用！');
                        called = true;
                        next(nextState);
                    });

                    if (!called) {
                        throw new Error('必须调用next方法!');
                    }
                } else {
                    funcs.every(nextFunc => {
                        nextFunc(newState, event);
                        return !event.isPropagationStopped();
                    });
                }
            };
            next(state);
        }

        return event;
    };

    emitter.middleware = (fn) => {
        middlewares.push(fn);
        return () => {
            const index = middlewares.indexOf(fn);
            if (index !== -1) {
                middlewares.splice(index, 1);
            }
        };
    };

    emitter.once = (fn) => {
        const once = (state) => {
            dispose();
            fn(state);
        };
        const dispose = emitter(once);
        return dispose;
    };

    emitter.destroy = () => {
        middlewares = funcs = null;
    };

    return emitter;
}

export function createAsyncEmitter() {
    let middlewares = [];
    let funcs = [];

    const emitter = (fn) => {
        funcs.push(fn);
        return () => {
            const index = funcs.indexOf(fn);
            if (index !== -1) {
                funcs.splice(index, 1);
            }
        };
    };

    emitter.emit = async (state) => {
        const event = new Event('emit');

        if (middlewares.length == 0) {
            for (let i = 0; i < funcs.length; i++) {
                await funcs[i](state, event);
                if (event.isPropagationStopped()) {
                    break;
                }
            }
        } else {
            let i = middlewares.length - 1;

            const next = async (newState) => {
                if (i >= 0 && !event.isDefaultPrevented()) {
                    let fn = middlewares[i];
                    let called = 0;
                    i--;

                    await fn(newState, event, async (nextState = newState) => {
                        if (called) throw new Error('next方法不可重复调用！');
                        called = 1;
                        await next(nextState);
                        called = 2;
                    });

                    if (!called) {
                        throw new Error('必须调用`next`方法!');
                    } else if (called == 1) {
                        throw new Error('必须使用`await next();`调用`next`方法!');
                    }
                } else {
                    for (let j = 0; j < funcs.length; j++) {
                        await funcs[j](state, event);
                        if (event.isPropagationStopped()) {
                            break;
                        }
                    }
                }
            };
            await next(state);
        }

        return event;
    };

    emitter.middleware = (fn) => {
        middlewares.push(fn);
        return () => {
            const index = middlewares.indexOf(fn);
            if (index !== -1) {
                middlewares.splice(index, 1);
            }
        };
    };

    emitter.destroy = () => {
        middlewares = funcs = null;
    };

    return emitter;
}

export default Event;

// var event = new EventEmitter();

// var fn = () => console.log(1);
// event.on('asdf asdf2', fn);
// event.trigger('asdf.bbb');
// event.off('asdf', fn);

// event.onceTrue('asdf', () => {
//     console.log('onceTrue');
//     return true;
// });
// event.trigger('asdf.bbb');

// console.log(event);
