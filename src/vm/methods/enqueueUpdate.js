import { getMemberName } from "./connect";

var taskId;
var taskCount = 1;
var callbacks = [];
var rendering = false;

export const defer = Promise.prototype.then.bind(Promise.resolve());
const doAsap = () => defer(flushCallbacks);

const getCurrentTime = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

const requestAnimationFrameWithTimeout = process.env.NODE_ENV === 'test' ? defer : function (callback) {
    let rafId,
        timerId;
    rafId = requestAnimationFrame(() => {
        clearTimeout(timerId);
        callback();
    });

    timerId = setTimeout(() => {
        cancelAnimationFrame(rafId);
        callback();
    }, 100);
};

function flushCallbacks() {
    // console.time('flushCallbacks');
    var cbs = callbacks;
    taskId = null;
    callbacks = [];

    for (var i = 0; i < cbs.length; i++) {
        cbs[i]();
    }
    // console.timeEnd('flushCallbacks');
}

function asap(cb) {
    callbacks.push(cb);
    if (!taskId) {
        doAsap();
        taskId = ++taskCount;
    }
    return taskId;
}

let initializers = {};
let initializerIds = [];
let doingInit = false;
let dirts;
// 标记脏数据 flags&&flags[model.state.id] === true;
let flags;
let flushing = false;
let changed;
let bubbled;

export function enqueueInit(observer) {
    initializers[observer.state.id] = observer;
    initializerIds.push(observer.state.id);
    if (doingInit) return;
    doingInit = true;
    rendering = true;

    asap(() => {
        for (let i = 0; i < initializerIds.length; i++) {
            const item = initializers[initializerIds[i]];
            if (item) {
                enqueueRender(item);
                // bubbleInit(item);
            }
        }
        initializers = {};
        initializerIds = [];
        doingInit = false;
    });
}

// function bubbleInit(target, paths) {
//     const parents = target.state.parents;
//     if (parents) {
//         const length = parents.length;
//         var i = -1;
//         var parent;
//         while (++i < length) {
//             parent = parents[i];
//             var name = getMemberName(parent, target);
//             var nextPaths = paths ? name + '/' + paths : name;
//             if (!initializers[parent.state.id]) {
//                 parent.trigger('datachanged:' + nextPaths, {
//                     paths: nextPaths
//                 });
//             }
//             bubbleInit(parent, nextPaths);
//         }
//     }
// }

export function enqueueUpdate(dirt) {
    const { state } = dirt;

    if (state.initialized && !state.dirty) {
        const { id } = state;
        if (initializers[id]) {
            delete initializers[id];
        }
        state.dirty = true;

        if (!dirts) {
            rendering = true;
            dirts = [];
            flags = {};
            if (!flushing) {
                asap(flushDirts);
            }
        }

        if (!flags[id]) {
            flags[id] = true;
            dirts.push(dirt);
        }
    }
}

function flushDirts() {
    flushing = true;
    while (dirts) {
        const items = dirts;
        const length = dirts.length;

        const lastChanged = changed;
        const lastBubbled = bubbled;
        changed = {};
        bubbled = {};

        var i = -1;
        var target;

        dirts = null;
        flags = null;

        while (++i < length) {
            target = items[i];
            target.state.dirty = false;
            emitChange(target);
        }

        changed = lastChanged;
        bubbled = lastBubbled;
    }
    flushing = false;
}

function emitChange(target) {
    if (!changed[target.state.id]) {
        changed[target.state.id] = true;
        target.state.updated = true;
        target.trigger('datachanged');
        enqueueRender(target);
        bubbleChange(target);
    }
}

function bubbleChange(target, paths) {
    if (!bubbled[target.state.id]) {
        bubbled[target.state.id] = true;
        const parents = target.state.parents;
        if (parents) {
            const length = parents.length;
            var i = -1;
            var parent;
            while (++i < length) {
                parent = parents[i];
                var name = getMemberName(parent, target);
                var nextPaths = paths ? name + '/' + paths : name;
                parent.trigger('datachanged:' + nextPaths, {
                    paths: nextPaths
                });
                bubbleChange(parent, nextPaths);
                !paths && emitChange(parent);
            }
        }
    }
}

export function emitUpdate(target) {
    const { state } = target;
    if (state.initialized) {
        const { id } = state;
        if (initializers[id]) {
            delete initializers[id];
        }
    }
    const lastChanged = changed;
    const lastBubbled = bubbled;
    changed = {};
    bubbled = {};
    emitChange(target);
    changed = lastChanged;
    bubbled = lastBubbled;
}

function newFiber() {
    return {
        index: 0,
        views: [],
        viewIds: {},
        current: null
    };
}

let nextCallbackIndex = -1;
let nextCallbacks = [];
let fiber = newFiber();
let isFlushingViews = false;
let flushingStartTime = 0;
let renderStartTime;

function enqueueRender(newView) {
    const { views, viewIds, current } = fiber;

    if (current && current.target === newView) {
        fiber.current = null;
    } else if (!viewIds[newView.state.id]) {
        views.push(newView);
        viewIds[newView.state.id] = true;
    }

    if (isFlushingViews) {
        return;
    }
    isFlushingViews = true;
    renderStartTime = getCurrentTime();

    scheduleFlushViews();
}

let _scheduleFlushViews;

if (typeof MessageChannel !== 'undefined' && /^\[object MessageChannelConstructor\]$|\[native code\]/.test(MessageChannel.toString())) {
    const channel = new MessageChannel();
    const port = channel.port2;
    channel.port1.onmessage = flushViews;
    _scheduleFlushViews = () => {
        port.postMessage(1);
    };
} else {
    _scheduleFlushViews = () => setTimeout(flushViews, 0);
}

function scheduleFlushViews() {
    flushingStartTime = getCurrentTime();
    requestAnimationFrameWithTimeout(_scheduleFlushViews);
}

export function shouldContinueFlushingViews() {
    return process.env.NODE_ENV === 'test' ? true : (getCurrentTime() - flushingStartTime < 33);
}

function flushViews() {
    if (!shouldContinueFlushingViews()) {
        scheduleFlushViews();
        return;
    }

    const { index, views, viewIds } = fiber;

    for (let i = index; i < views.length; i++) {
        const target = views[i];
        const id = target.state.id;

        viewIds[id] = false;

        if (target.state.renderedVersion !== target.state.version && !target.state.isDestroyed) {
            target.render(fiber);
            if (fiber.current) {
                scheduleFlushViews();
                return;
            }
            target.state.renderedVersion = target.state.version;
            target.trigger('render');
        }

        fiber.index = i + 1;
        fiber.current = null;

        if (!shouldContinueFlushingViews()) {
            scheduleFlushViews();
            return;
        }
    }

    isFlushingViews = false;
    fiber = newFiber();

    if (getCurrentTime() - renderStartTime > 50) {
        console.log('vm rendered', getCurrentTime() - renderStartTime);
    }

    if (!dirts && !initializerIds.length) {
        rendering = false;
        let j = nextCallbackIndex;
        while (++j < nextCallbacks.length) {
            if (rendering) {
                nextCallbackIndex = j - 1;
                return;
            } else {
                nextCallbacks[j]();
            }
        }

        nextCallbackIndex = -1;
        nextCallbacks = [];
    }
}

export function nextTick(cb) {
    if (rendering) {
        nextCallbacks.push(cb);
    } else {
        cb();
        return false;
    }
    return true;
}
