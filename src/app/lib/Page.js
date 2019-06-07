import { IPage, PageLifecycleDelegate } from '../types';
import { Model, State } from '../../vm';
import { store } from '../../utils';
import { EventEmitter } from '../../core/event';
import preloader from '../../../preloader';
import { Sharer } from '../appsdk/share/ShareData';

const extentions = [];

export class Page extends EventEmitter implements IPage {

    static extentions = {
        lifecycle: ({ onCreate, onDestroy }) => {
            extentions.push({
                onCreate,
                onDestroy
            });
        }
    }

    constructor(activity) {
        super();
        this.activity = activity;
        this._cache = new Model();
        this.title = preloader.defaultTitle;
        this.sharer = new Sharer();

        this.messageChannel = new EventEmitter();
        this.status = new State('new');

        extentions.forEach(({ onCreate, onDestroy }) => {
            if (onCreate) {
                this.on('create', () => onCreate(this));
            }
            if (onDestroy) {
                this.on('destroy', () => onDestroy(this));
            }
        });

        this
            .on('create init pause resume', (e) => this.status.set(e.type))
            .on('show', () => {
                document.title = this.title;
                this.sharer.sync();
                this.status.set('show');
            })
            .on('destroy', () => {
                this.messageChannel.off();
                this.status
                    .set('destroy')
                    .then(() => {
                        this.status.destroy();
                    });
            });
    }

    get el() {
        return this.activity.el;
    }

    get location(): Location {
        return this.activity.location;
    }

    isActive() {
        return this.activity.application.currentActivity === this.activity;
    }

    isDestroy() {
        return this.activity.isDestroy;
    }

    postMessage(state) {
        if (!state.type) throw new Error('postMessage must has a `type`!');
        this.messageChannel.trigger(state.type, state);
    }

    ready(fn) {
        this.activity.ready(fn);
    }

    setTitle(title) {
        this.title = title;
        if (this.isActive()) {
            document.title = title;
        }
        return this;
    }

    getSharer() {
        return {
            push: (shareData) => {
                this.sharer.push(shareData, this.isActive());
                return this;
            },
            get: () => {
                return this.sharer.get();
            },
            set: (shareData) => {
                this.setShareData(shareData);
            },
            pop: () => {
                this.sharer.pop(this.isActive());
                return this;
            },
            clear: () => {
                this.sharer.clear(this.isActive());
                return this;
            }
        };
    }

    setShareData(shareData) {
        this.sharer.set(shareData, this.isActive());
        return this;
    }

    getShareData() {
        return this.sharer.get();
    }

    setLifecycleDelegate(delegate: PageLifecycleDelegate) {
        this.activity.lifecycle = delegate || {};
    }

    addOnShowListener(cb) {
        return this.on("show", cb);
    }

    addOnQsChangeListener(cb) {
        return this.on("qschange", cb);
    }

    addOnResumeListener(cb) {
        return this.on("resume", cb);
    }

    addOnPauseListener(cb) {
        return this.on("pause", cb);
    }

    addOnDestroyListener(cb) {
        return this.on("destroy", cb);
    }

    get cache() {
        return this._cache.attributes;
    }

    set cache(cache) {
        return this._cache.set(true, cache);
    }

    setCache(cache) {
        this._cache.set(cache);
    }

    storeCache() {
        var main = this.getMainElement();
        if (main) {
            // 缓存scroll位置和当前状态，用以返回时恢复
            var state = this.cache;
            var cachedPageState = {
                url: this.location.url,
                scrollTop: main.scrollTop,
                state: state
            };

            try {
                JSON.stringify(cachedPageState);
            } catch (e) {
                cachedPageState = {
                    url: this.location.url,
                    scrollTop: main.scrollTop
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
        var main = this.getMainElement();
        return main && main.__widget_scroll__;
    }

    getMainElement() {
        return this.el && this.el.querySelector('.main');
    }

    getPreviousPage() {
        return (this.activity._prev && this.activity._prev.page) || null;
    }
}