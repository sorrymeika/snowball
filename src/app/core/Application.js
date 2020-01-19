
import { store, isThenable } from '../../utils';
import { popup } from '../../widget';

import { IApplication, IRouter, IActivityManager, INavigation } from '../types';
import { withAutowired } from './autowired';
import { bindBackGesture } from './gesture';

export default class Application implements IApplication {

    activityManager: IActivityManager;
    navigation: INavigation;

    constructor(
        router: IRouter,
        rootElement,
        options
    ) {
        this.router = router;
        this.rootElement = rootElement;
        this.options = options;
    }

    setActivityManager(activityManager) {
        this.activityManager = activityManager;
        return this;
    }

    setNavigation(navigation) {
        this.navigation = navigation;
        return this;
    }

    /**
     * 启动应用
     * @return {Application} 返回当前应用
     */
    start(callback) {
        this.navigation.startNavigateListener();

        if ('ontouchmove' in document.body) {
            bindBackGesture(this);
        }

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
            .then(() => {
                if (callback) {
                    withAutowired(this, () => {
                        callback(this.ctx);
                    });
                }
            });

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

    whenNotNavigating(fn) {
        return this.navigationTask
            ? (this.navigationTask = this.navigationTask.then(fn))
            : fn();
    }

    registerRoutes(routes) {
        this.router.registerRoutes(routes);
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
        let routeMatch = this.router.match(url);
        if (isThenable(routeMatch)) {
            routeMatch = await routeMatch;
        }
        if (!routeMatch) return false;

        const { route, location } = routeMatch;
        const prevActivity = this.currentActivity;
        const { withTransition, beforeNavigate, onNavigateFailure } = options;

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
        let newActivity = activityManager.getOrCreate(route, location, isForward);
        if (isThenable(newActivity)) {
            newActivity = await newActivity;
        }
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

        await activityManager.replaceActivity(prevActivity, newActivity, props, {
            isForward,
            withTransition: withTransition !== false
        });

        newActivity.active();

        return true;
    }
}