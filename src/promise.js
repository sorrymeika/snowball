var BrowserMutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var flushQueue = new Array(1000);
var len = 0;

// as soon as possible
function asap(callback, arg) {
    flushQueue[len] = callback;
    flushQueue[len + 1] = arg;
    len += 2;
    if (len === 2) {
        scheduleFlush();
    }
}

function flush() {
    for (var i = 0; i < len; i += 2) {
        var callback = flushQueue[i];
        var arg = flushQueue[i + 1];

        callback(arg);

        flushQueue[i] = undefined;
        flushQueue[i + 1] = undefined;
    }

    len = 0;
}

function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');

    observer.observe(node, { characterData: true });

    return function () {
        node.data = (iterations = ++iterations % 2);
    };
}

function useSetTimeout() {
    return function () {
        setTimeout(flush, 0);
    };
}

var scheduleFlush;

if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
} else {
    scheduleFlush = useSetTimeout();
}

function isThenable(thenable) {
    return thenable && typeof thenable.then === 'function';
}

function tryCatch(thenable, _resolve, _reject) {
    if (isThenable(thenable)) {
        thenable.then(_resolve, _reject);
    } else {
        try {
            if (typeof _resolve == 'function') asap(_resolve, thenable);
        } catch (e) {
            _reject && asap(_reject, e);
        }
    }
}

function resolve(thenable) {
    return new Promise(function (_resolve, _reject) {
        tryCatch(thenable, _resolve, _reject);
    });
}

function reject(value) {
    return new Promise(function (_resolve, _reject) {
        asap(_reject, value);
    });
}

function handleRejection(e, onRejected, nextFulfilled, nextRejected) {
    if (typeof onRejected === 'function') {
        onRejected(e);
        nextFulfilled(null);
    } else {
        nextRejected(e);
    }
}

function emitRejection(e, onRejected, nextFulfilled, nextRejected) {
    asap(function () {
        handleRejection(e, onRejected, nextFulfilled, nextRejected);
    })
}

function emit(res, onFulfilled, onRejected, nextFulfilled, nextRejected) {
    var thenable;

    asap(function () {
        try {
            thenable = onFulfilled ? onFulfilled(res) : null;
        } catch (e) {
            handleRejection(e, onRejected, nextFulfilled, nextRejected);
            return;
        }

        tryCatch(thenable, nextFulfilled, nextRejected);
    })
}


function Promise(callback) {
    if (!(this instanceof Promise))
        return new Promise(callback);

    var self = this;
    var queue = [];

    this.state = -1;
    this.queue = queue;

    callback(function (res) {
        self.state = 1;
        self._result = res;

        for (var next; (next = queue.shift());) {
            emit(res, next.onFulfilled, next.onRejected, next.nextFulfilled, next.nextRejected);
        }

    }, function (e) {
        self.state = 0;
        self._error = e;

        for (var next; (next = queue.shift());) {
            emitRejection(e, next.onRejected, next.nextFulfilled, next.nextRejected);
        }
    });
}

Promise.resolve = resolve;
Promise.reject = reject;

Promise.prototype = {
    then: function (onFulfilled, onRejected) {
        var self = this;

        return new Promise(function (nextFulfilled, nextRejected) {
            switch (self.state) {
                case -1:
                    self.queue.push({
                        nextFulfilled: nextFulfilled,
                        nextRejected: nextRejected,
                        onFulfilled: onFulfilled,
                        onRejected: onRejected
                    });
                    break;
                case 1:
                    emit(self._result, onFulfilled, onRejected, nextFulfilled, nextRejected);
                    break;
                case 0:
                    emitRejection(self._error, onRejected, nextFulfilled, nextRejected);
                    break;
            }
        });
    },

    'catch': function (onRejected) {
        return this.then(null, onRejected);
    }
}

Promise.all = function (all) {
    return this.each(all, null, false);
}

Promise.race = function (all) {
    return this.each(all, false, false);
}

Promise.some = function (some) {
    return this.each(some);
}

Promise.each = function (all, _resolve, _reject) {
    return new Promise(function (onFulfilled, onRejected) {
        var count = all.length;
        var results = [];
        var errors = [];

        var checkNext = function (data, onFinish, each, i) {
            return function (e) {
                if (count == -1) return;

                if (each === false || typeof each === 'function' && each(e, i) === false) {
                    count = -1;

                    onFinish(e);
                    return;
                }
                data[i] = e;

                count--;

                if (count == 0) {
                    if (errors.length) {
                        onRejected(errors);
                    }
                    if (results.length) {
                        onFulfilled(results);
                    }
                }
            }
        }

        all.forEach(function (item, i) {
            tryCatch(item, checkNext(results, onFulfilled, _resolve, i), checkNext(errors, onRejected, _reject, i));
        });
    });
}

module.exports = Promise;