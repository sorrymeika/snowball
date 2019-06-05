var BrowserMutationObserver = window.MutationObserver || window.WebKitMutationObserver;
var taskId = 0;

function useMutationObserver() {
    var iterations = 0;
    var queue = [];
    var observer = new BrowserMutationObserver(() => {
        for (var i = 0; i < queue.length; i++) {
            queue[i]();
        }
        queue = [];
    });
    var node = document.createTextNode('');

    observer.observe(node, { characterData: true });

    return function (next) {
        queue.push(next);
        node.data = (iterations = ++iterations % 2);
        return ++taskId;
    };
}

function useSetTimeout() {
    return function (next) {
        setTimeout(next, 0);
        return ++taskId;
    };
}

export const asap = BrowserMutationObserver
    ? useMutationObserver()
    : useSetTimeout();