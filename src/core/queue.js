var LinkList = require('./linklist');
var slice = Array.prototype.slice;
var rparam = /^\$(\d+)$/;


function done(queue, err, res) {
    var doneFirst = queue.shift,
        then = queue.queue.shift(),
        next,
        ctx,
        promise;

    if (then) {
        next = then[0];
        ctx = then[1];

        if (next instanceof Queue) {
            next.then(doneFirst, ctx);

        } else if (typeof next == 'function') {
            var nextReturn = next.call(ctx, err, res, doneFirst);

            if (nextReturn instanceof Queue && nextReturn !== queue) {
                nextReturn.then(doneFirst);
            }

        } else {
            done(queue, null, next);
        }

    } else {
        queue.state = STATUS.DONE;
    }
};

var STATUS = {
    INIT: 2,
    PENDDING: 0,
    DONE: 1
};


var Queue = function (callback, ctx) {
    if (!(this instanceof Queue))
        return new Queue(callback, ctx);

    var self = this;

    this.queue = new LinkList();
    this.state = STATUS.PENDDING;

    this.shift = function (err, res) {
        done(self, err, res);
    };

    if (!callback && typeof args == 'number') {
        this.state = STATUS.PENDDING;
        this.start(args);

    } else if (callback) {
        this.state = STATUS.PENDDING;

        callback.call(ctx || this, this.shift);
    }
}

Queue.prototype = {

    start: function (number) {
        var self = this,
            fn = function () {
                self._count = number;
                self.result = [];
                self.errors = [];
            };

        self.queue.append([fn, this]);

        return self;
    },

    done: function (index, err, data) {
        this._count--;

        if (err)
            this.errors[index] = err;

        this.result[index] = data;

        if (this._count <= 0) {
            done(this, this.errors.length ? this.errors : null, this.result);
        }
    },

    each: function (argsList, callback, ctx) {

        var doneOne = this.done.bind(this);
        var self = this;

        var fn = function () {
            self._count = argsList.length;
            self.result = [];
            self.errors = [];

            argsList.forEach(function (args, j) {

                callback.call(self, j, args, doneOne);
            });
        };

        this.queue.append([fn, ctx || this]);

        this.push(function (err, res, next) {
            next(this.errors.length ? this.errors : null, this.result);

        }, this);

        return this;
    },

    push: function (callback, ctx) {
        var self = this;

        self.queue.append([callback, ctx || this]);

        if (self.state === STATUS.DONE) {
            self.state = STATUS.PENDDING;

            done(self);
        }

        return self;
    }
};


Queue.done = function (data) {

    return new Queue(function (done) {

        data instanceof Queue ? data.push(done) : done(this, data);
    });
}

module.exports = Queue;
