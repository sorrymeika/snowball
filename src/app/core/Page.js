import { IPage, PageLifecycleDelegate } from '../types';
import { Model, observable, autorun } from '../../vm';
import { store, copyProperties } from '../../utils';
import { EventEmitter, createAsyncEmitter, createEmitter, EventDelegate } from '../../core/event';

const defaultTitle = document.title;

const extentions = [];

class PageCtx extends EventEmitter {
    constructor(page, app) {
        super();

        this.page = page;
        this.app = app;
    }

    get navigation() {
        return this.app.navigation;
    }

    get location() {
        return this.page.location;
    }

    delegate(eventEmitter, type, listener) {
        const delegate = new EventDelegate(eventEmitter, type, listener);
        this.page.on('destroy', delegate.off);
        return delegate;
    }

    createEmitter(init) {
        const event = createEmitter(init);
        this.page.on('destroy', event.off);
        return event;
    }

    createAsyncEmitter(init) {
        const event = createAsyncEmitter(init);
        this.page.on('destroy', event.off);
        return event;
    }

    autorun(fn) {
        const dispose = autorun(fn);
        this.page.on('destroy', dispose);
        return dispose;
    }

    useObservable(value) {
        const observer = observable(value);
        this.page.on('destroy', () => observer.destroy());
        return observer;
    }

    autoDispose(fn) {
        this.page.on('destroy', fn);
        return fn;
    }
}

function createPageCtx(page, app) {
    const pageCtx = new PageCtx(page, app);

    page.on('destroy', () => {
        pageCtx.off();
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
            copyProperties(Page.prototype, props);
        },
        react({ Provider }) {
            Object.defineProperty(Page.prototype, 'react', {
                value: {
                    Provider
                },
                writable: false
            });
        },
        ctx(props) {
            copyProperties(PageCtx.prototype, props);
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