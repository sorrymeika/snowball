import { IPage, PageLifecycleDelegate } from '../types';
import { Model, Emitter } from '../../vm';
import { store } from '../../utils';
import { EventEmitter } from '../../core/event';

const extentions = [];

const defaultTitle = document.title;

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
        this._messageChannel = new EventEmitter();

        this.postMessage = this.postMessage.bind(this);
        this.ctx = Object.create(ctx, {
            page: this,
            on: this._messageChannel.on.bind(this._messageChannel),
            off: this._messageChannel.off.bind(this._messageChannel),
            once: this._messageChannel.one.bind(this._messageChannel),
            emit: this.postMessage,
            createEvent: () => {
                const emitter = new Emitter();
                const emitWrapper = (fn) => emitter.observe(fn);
                emitWrapper.emit = (data) => {
                    emitter.set(data);
                };
                this.on('destroy', () => emitter.destroy());
                return emitWrapper;
            }
        });

        extentions.forEach(({ initialize, onCreate, onShow, onDestroy }) => {
            if (initialize) initialize.call(this);
            if (onCreate) this.on('create', () => onCreate.call(this));
            if (onShow) this.on('show', () => onShow.call(this));
            if (onDestroy) this.on('destroy', () => onDestroy.call(this));
        });

        this
            .on('show', () => {
                document.title = this._title;
            })
            .on('destroy', () => {
                this._messageChannel.off();
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

    postMessage(state) {
        if (!state.type) throw new Error('postMessage must has a `type`!');
        this._messageChannel.trigger(state.type, state);
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
                state: state
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