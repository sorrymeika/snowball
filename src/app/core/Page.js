import { IPage, PageLifecycleDelegate } from '../types';
import { Model, Emitter, observable } from '../../vm';
import { store } from '../../utils';
import { EventEmitter } from '../../core/event';

const extentions = [];

const defaultTitle = document.title;

function createPageCtx(page, ctx) {
    const messageChannel = new EventEmitter();
    const toDiscriptor = (props) => {
        return Object.keys(props)
            .reduce((res, key) => {
                res[key] = {
                    writable: false,
                    value: props[key]
                };
                return res;
            }, {});
    };
    const pageCtx = Object.create(ctx, {
        location: {
            get() {
                return page.location;
            }
        },
        page: {
            get() {
                return page;
            }
        },
        ...toDiscriptor({
            on: (type, fn) => {
                const cb = (e) => fn(e);
                cb._cb = fn;
                messageChannel.on(type, cb);
                return pageCtx;
            },
            off: (...args) => {
                messageChannel.off(...args);
                return pageCtx;
            },
            once: (type, callback) => {
                function once(e) {
                    messageChannel.off(name, once);
                    return callback.call(pageCtx, e);
                }
                once._cb = callback;
                messageChannel.on(type, once);
                return pageCtx;
            },
            emit: (state) => {
                if (!state.type) throw new Error('emit must has a `type`!');
                messageChannel.trigger(state);
            },
            createEvent: () => {
                const emitter = new Emitter();
                const emitWrapper = (fn) => emitter.observe(fn);
                emitWrapper.emit = (data) => {
                    emitter.set(data);
                };
                emitWrapper.once = (fn) => {
                    let dispose;
                    const cb = (data, e) => {
                        dispose();
                        fn(data, e);
                    };
                    dispose = emitter.observe(cb);
                };
                page.on('destroy', () => emitter.destroy());
                return emitWrapper;
            },
            useObservable: (value) => {
                const observer = observable(value);
                page.on('destroy', () => observer.destroy());
                return observer;
            }
        })
    });

    page.on('destroy', () => {
        messageChannel.off();
    });

    return pageCtx;
}

export class Page extends EventEmitter implements IPage {

    static extentions = {
        lifecycle: ({ initialize, onShow, onCreate, onDestroy }) => {
            extentions.push({
                initialize,
                onShow,
                onCreate,
                onDestroy,
            });
        },
        mixin: (props) => {
            Object.defineProperties(Page.prototype, Object.getOwnPropertyDescriptors(props));
        }
    }

    constructor(activity, ctx) {
        super();
        this._activity = activity;
        this._cache = new Model();
        this._title = defaultTitle;
        this.ctx = createPageCtx(this, ctx);

        extentions.forEach(({ initialize, onCreate, onShow, onDestroy }) => {
            if (initialize) initialize.call(this);
            if (onCreate) this.on('create', () => onCreate.call(this));
            if (onShow) this.on('show', () => onShow.call(this));
            if (onDestroy) this.on('destroy', () => onDestroy.call(this));
        });

        this.on('show', () => {
            document.title = this._title;
        });
    }

    get el() {
        return this._activity.el;
    }

    get location(): Location {
        return this._activity.location;
    }

    set title(title) {
        this._title = title;
        if (this.isActive()) {
            document.title = title;
        }
    }

    get title() {
        return this._title;
    }

    get previousPage() {
        return (this._activity._prev && this._activity._prev.page) || null;
    }

    isActive() {
        return this._activity.application.currentActivity === this._activity;
    }

    isDestroyed() {
        return this._activity.isDestroyed;
    }

    setLifecycleDelegate(delegate: PageLifecycleDelegate) {
        this._activity.lifecycle = delegate || {};
    }

    get cache() {
        return this._cache.attributes;
    }

    set cache(cache) {
        return this._cache.set(true, cache);
    }

    mergeCache(cache) {
        this._cache.set(cache);
    }

    storeCache() {
        const mainScrollView = this.getMainScrollView();
        if (mainScrollView) {
            // 缓存scroll位置和当前状态，用以返回时恢复
            var state = this.cache;
            var cachedPageState = {
                url: this.location.url,
                scrollTop: mainScrollView.scrollTop(),
                state
            };

            try {
                JSON.stringify(cachedPageState);
            } catch (e) {
                cachedPageState = {
                    url: this.location.url,
                    scrollTop: mainScrollView.scrollTop()
                };
            }

            var pageHistory = store('SNOWBALL_LAST_PAGE_CACHE') || [];
            pageHistory.push(cachedPageState);
            store('SNOWBALL_LAST_PAGE_CACHE', pageHistory);
        }
    }

    findNode(selector) {
        return this.el && this.el.querySelector(selector);
    }

    findNodeAll(selector) {
        return this.el && this.el.querySelectorAll(selector);
    }

    getMainScrollView() {
        var main = this.el && this.el.querySelector('.app-main');
        return main && main.__widget_scroll__;
    }
}