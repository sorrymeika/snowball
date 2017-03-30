var slice = [].slice,
    separator = /\s+/,

    returnFalse = function () {
        return false;
    },

    returnTrue = function () {
        return true;
    };

function eachEvent(events, callback, iterator) {

    (events || '').split(separator).forEach(function (type) {
        iterator(type, callback);
    });
}

function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)');
}

function parse(name) {
    var parts = ('' + name).split('.');

    return {
        e: parts[0],
        ns: parts.slice(1).sort().join(' ')
    };
}

function findHandlers(arr, name, callback, context) {
    var matcher,
        obj;

    obj = parse(name);
    obj.ns && (matcher = matcherFor(obj.ns));
    return arr.filter(function (handler) {
        return handler &&
            (!obj.e || handler.e === obj.e) &&
            (!obj.ns || matcher.test(handler.ns)) &&
            (!callback || handler.cb === callback ||
                handler.cb._cb === callback) &&
            (!context || handler.ctx === context);
    });
}

function Event(type, props) {
    if (!(this instanceof Event)) {
        return new Event(type, props);
    }

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

var event = {

    on: function (name, callback, context) {
        var me = this,
            set;

        if (!callback) {
            return this;
        }

        set = this._events || (this._events = []);

        eachEvent(name, callback, function (name, callback) {
            var handler = parse(name);

            handler.cb = callback;
            handler.ctx = context;
            handler.ctx2 = context || me;
            handler.id = set.length;
            set.push(handler);
        });

        return this;
    },

    onceTrue: function (name, callback, context) {
        var me = this;

        if (!callback) {
            return this;
        }

        eachEvent(name, callback, function (name, callback) {
            var once = function () {
                var res = callback.apply(context || me, arguments);

                if (res === true)
                    me.off(name, once);

                return res;
            };

            once._cb = callback;
            me.on(name, once, context);
        });

        return this;
    },

    one: function (name, callback, context) {
        var me = this;

        if (!callback) {
            return this;
        }

        eachEvent(name, callback, function (name, callback) {
            var once = function () {
                me.off(name, once);
                return callback.apply(context || me, arguments);
            };

            once._cb = callback;
            me.on(name, once, context);
        });

        return this;
    },

    off: function (name, callback, context) {
        var events = this._events;

        if (!events) {
            return this;
        }

        if (!name && !callback && !context) {
            this._events = [];
            return this;
        }

        eachEvent(name, callback, function (name, callback) {
            findHandlers(events, name, callback, context)
                .forEach(function (handler) {
                    delete events[handler.id];
                });
        });

        return this;
    },

    trigger: function (evt) {
        var i = -1,
            args,
            events,
            stoped,
            len,
            ev;

        if (!this._events || !evt) {
            return this;
        }

        typeof evt === 'string' && (evt = new Event(evt));

        args = slice.call(arguments, 1);
        evt.args = args;
        args.unshift(evt);

        events = findHandlers(this._events, evt.type);

        if (events) {
            len = events.length;

            while (++i < len) {
                if ((stoped = evt.isPropagationStopped()) || false ===
                    (ev = events[i]).cb.apply(ev.ctx2, args)
                ) {

                    stoped || (evt.stopPropagation(), evt.preventDefault());
                    break;
                }
            }
        }

        return this;
    }
};

Event.mixin = function (fn, ext) {
    Object.assign(typeof fn == 'function' ? fn.prototype : fn, event, ext);

    return fn;
}

Event.extend = function (fn, ext) {
    fn.prototype = Object.create(event);

    ext && Object.assign(fn.prototype, ext);

    return fn;
}

module.exports = Event;
