
import { store } from '../../utils';
import { popup } from '../../widget';

import { IApplication, IRouteManager, IActivityManager } from '../types';

export default class Application implements IApplication {

    constructor(
        navigationFactory: (app: IApplication) => INavigation,
        activityManagerFactory: (app: IApplication) => IActivityManager,
        routeManager: IRouteManager,
        rootElement,
        options = {}
    ) {
        this.routeManager = routeManager;
        this.rootElement = rootElement;
        this.options = options;

        this.activityManager = activityManagerFactory(this, options);
        this.navigation = navigationFactory(this, options);
    }

    /**
     * 启动应用
     * @return {Application} 返回当前应用
     */
    start(callback) {
        this.navigation.startNavigateListener();

        if (history.length == 1) {
            store('SNOWBALL_LAST_PAGE_CACHE', null);
        } else {
            var pageHistory = store('SNOWBALL_LAST_PAGE_CACHE');

            var cache;
            if (pageHistory && pageHistory.length) {
                cache = pageHistory.pop();
                if ('#' + cache.url != location.hash || !cache.scrollTop) {
                    cache = null;
                    pageHistory = null;
                }
                store('SNOWBALL_LAST_PAGE_CACHE', pageHistory);
            }
        }

        this.hashChangeTime = Date.now();
        this.pageCache = cache;
        this.isStarting = true;
        this.navigate(location.hash, { isForward: true })
            .catch((err) => {
                console.error(err);
            })
            .then(() => {
                this.pageCache = null;
            })
            .then(callback);

        if (cache) {
            this.navigationTask.then(async () => {
                cache.state && this.currentActivity.setProps(cache.state);

                var count = 20;
                (async () => {
                    do {
                        await new Promise((resolve) => {
                            setTimeout(resolve, 500);
                        });
                        var main = this.currentActivity.page.getMainScrollView();
                        if (main) {
                            main.scrollTop(cache.scrollTop);
                            main.detectImageLazyLoad();
                        }
                    } while (count-- > 0 && ((main && main.scrollTop()) || 0) < cache.scrollTop);
                })();
            });
        }

        return this;
    }

    then(fn) {
        return this.navigationTask
            ? (this.navigationTask = this.navigationTask.then(fn))
            : fn();
    }

    /**
     * 匹配路由并跳转至关联页面
     * 队列方式，避免hashchange多次同时触发出错
     */
    navigate(url, options = {}, props?) {
        this.navigating = true;
        this.navigationTask = this.navigationTask
            ? this.navigationTask.then(this._navigate.bind(this, url, options, props))
            : this._navigate(url, options, props);

        return this.navigationTask.then((res) => {
            this.navigating = false;
            return res;
        });
    }

    /**
     * 匹配路由并跳转至关联页面
     */
    async _navigate(url, options = {}, props?) {
        const location = await this.routeManager.match(url);
        if (!location) return false;

        const prevActivity = this.currentActivity;
        const { withAnimation, beforeNavigate, onNavigateFailure } = options;

        beforeNavigate && await beforeNavigate();

        if (prevActivity && location.path == prevActivity.location.path) {
            prevActivity.setProps({
                location,
                ...props
            }, () => {
                prevActivity.qsChange();
            });
            this.navigation.url = location.url;
            return true;
        }
        this.now = Date.now();

        let { isForward } = options;

        const activityManager = this.activityManager;
        const newActivity = await activityManager.getOrCreate(location, isForward);
        if (!newActivity) {
            onNavigateFailure && onNavigateFailure();
            return false;
        }

        if (prevActivity) {
            popup.hideAllPopups();

            if (isForward) {
                newActivity._prev && (newActivity._prev._next = newActivity._next);
                newActivity._next && (newActivity._next._prev = newActivity._prev);

                newActivity._prev = prevActivity;
                prevActivity._next = newActivity;
            }
            location.referrer = newActivity._prev ? newActivity._prev.url : null;
        } else {
            isForward = true;
        }
        newActivity.location = location;

        this.navigation.url = location.url;
        this.navigation.referrer = location.referrer;
        this.navigation.isForward = newActivity.isForward = isForward;

        this.prevActivity = prevActivity;
        this.currentActivity = newActivity;

        await activityManager.replaceActivity(prevActivity, newActivity, withAnimation !== false, props);

        newActivity.resume();

        return true;
    }
}