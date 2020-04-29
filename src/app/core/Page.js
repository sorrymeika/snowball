import { IPage, PageLifecycle } from '../types';
import { Model } from '../../vm';
import { store, copyProperties } from '../../utils';
import { EventEmitter } from '../../core/event';
import PageCtx from './PageCtx';

const defaultTitle = document.title;
const lifecycles = [];

function createPageCtx(page, app, configs) {
    const pageCtx = new PageCtx(page, app, configs);

    page.on('destroy', () => {
        pageCtx.off();
    });

    return pageCtx;
}

export function bindPageLifecycle(page, lifecycle) {
    Object.keys(lifecycle)
        .forEach(name => {
            if (/^on(\w+)$/.test(name)) {
                const lifecycleName = RegExp.$1.toLowerCase();
                const lifecycleFn = lifecycle[name];
                page.on(lifecycleName, () => lifecycleFn.call(page, page.ctx));
            }
        });
}

export class Page extends EventEmitter implements IPage {

    static extentions = {
        lifecycle: (lifecycle: PageLifecycle) => {
            lifecycles.push(lifecycle);
        },
        mixin: (props) => {
            copyProperties(Page.prototype, props);
        },
        react(props: { Provider: any }) {
            copyProperties(Page.prototype.react || (Page.prototype.react = {}), props);
        },
        ctx(props) {
            copyProperties(PageCtx.prototype, props);
        }
    }

    constructor(activity, app, configs) {
        super();
        this._activity = activity;
        this._cache = new Model();
        this._title = defaultTitle;
        this.app = app;
        this.ctx = createPageCtx(this, app, configs);

        lifecycles.forEach(({
            initialize,
            ...lifecycle
        }) => {
            if (initialize) initialize.call(this);
            bindPageLifecycle(this, lifecycle);
        });

        this.on('show', () => {
            document.title = this._title;
        });
    }

    get status() {
        return this._activity.status;
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