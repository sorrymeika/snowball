
let hasBindBeforeBack = false;
const beforeBackListeners = [];
const beforeBackListener = (e) => {
    if (e.isDefaultPrevented() || e.isPropagationStopped()) return false;
    var i = beforeBackListeners.length;

    while (--i >= 0) {
        var fn = beforeBackListeners[i];
        var res = fn(e);
        if (!res || e.isDefaultPrevented() || e.isPropagationStopped()) return false;
    }
};

export function removeOnBeforeBackListener(fn) {
    if (hasBindBeforeBack) {
        window.removeEventListener('beforeback', fn);
    }
    var i = beforeBackListeners.length;
    while (--i >= 0) {
        if (fn === beforeBackListeners[i]) {
            beforeBackListeners.splice(i, 1);
            break;
        }
    }
}

export function addOnBeforeBackListener(fn) {
    if (!hasBindBeforeBack) {
        hasBindBeforeBack = true;
        window.addEventListener('beforeback', beforeBackListener);
    }
    beforeBackListeners.push(fn);
}