import { castStyle, getTransition } from '../../graphics/animation';
import { loader } from '../../widget';
import { $, isThenable } from '../../utils';

import { IApplication, IActivityManager, ToggleOptions } from '../types';

import Activity from './Activity';

export default class ActivityManager implements IActivityManager {

    application: IApplication;

    constructor(application, options) {
        this.activitiesCache = [];
        this.options = options;
        this.application = application;
    }

    findLatest(path) {
        for (let i = this.activitiesCache.length - 1; i >= 0; i--) {
            if (this.activitiesCache[i].location.path === path) {
                return this.activitiesCache[i];
            }
        }
        return null;
    }

    getOrCreate(route, location, forceCreate: boolean): Activity {
        let activity;
        if (forceCreate || !(activity = this.findLatest(location.path))) {
            activity = createActivity(route, location, this.application);
            if (isThenable(activity)) {
                return activity.then((realActivity) => {
                    this.activitiesCache.push(realActivity);
                    return realActivity;
                });
            }
            this.activitiesCache.push(activity);
        }
        return activity;
    }

    /**
     * 页面切换
     * @param {Activity} prevActivity 当前要被替换掉的页面
     * @param {Activity} activity 当前要切换到的页面
     * @param {object} intentProps 传给下个页面的props
     * @param {ToggleOptions}  toggleOptions 切换选项
     */
    replaceActivity(prevActivity, activity, intentProps, toggleOptions: ToggleOptions) {
        const application = this.application;
        const { withTransition, isForward } = toggleOptions;

        activity.$el.siblings('.app-view').each(function () {
            if (!prevActivity || this !== prevActivity.el) {
                this.style.display = 'none';
            }
        });

        let resolveTransition;
        let transitionTask = new Promise((resolve) => {
            resolveTransition = resolve;
        });

        let resolveRender;
        let renderTask = new Promise((resolve) => {
            resolveRender = () => {
                if (application.isStarting) {
                    console.timeEnd("Start React App spend");
                    application.isStarting = false;
                }
                console.log('%copen:%c ' + activity.location.path + ' %c total time', 'border-radius:2px;padding:0 2px;background:green;color:#fff', 'color:#000', 'color:green', Date.now() - application.now + 'ms');
                resolve();
            };
        });

        const replacingTask = Promise.all([transitionTask, renderTask])
            .then(() => {
                activity.setTransitionTask(null);
            });

        activity
            .setTransitionTask(transitionTask)
            .setProps({
                location: activity.location,
                ...intentProps
            }, resolveRender);

        if (prevActivity && prevActivity.location.path === activity.location.path) {
            resolveTransition();
            return replacingTask;
        }

        const { disableTransition = false } = this.options;

        if (prevActivity && withTransition && !disableTransition) {
            replaceActivityWithTransition(this, prevActivity, activity, isForward, resolveTransition);
        } else {
            activity.$el.css({
                opacity: 1,
                display: 'block',
                '-webkit-transform': 'translate3d(0%,0%,0)'
            });
            activity.page.trigger('beforeshow');
            activity.show(!prevActivity
                ? resolveTransition
                : () => {
                    prevActivity.page.trigger('beforehide');
                    prevActivity.$el.removeClass('app-view-actived');
                    prevActivity.$el.css({ zIndex: '' });
                    prevActivity.page.trigger('hide');
                    if (disableTransition || !isForward) {
                        disposeUselessActivities(this, prevActivity, activity);
                    } else {
                        prevActivity.pause();
                    }
                    resolveTransition();
                });
        }

        return replacingTask;
    }
}

/**
* 根据url获取页面组件
*
* @param {Route} 页面路由
*/
function createActivity(route, location, application) {
    let type = route.type;

    if (isThenable(type)) {
        loader.showLoader();
        return type.then((res) => {
            route.viewFactory = res;
            loader.hideLoader();
            return createActivityFromModule(res, location, application);
        });
    }

    return createActivityFromModule(type, location, application);
}

function createActivityFromModule(type, location, application) {
    return new Activity(type.default || type, location, application);
}

function replaceActivityWithTransition(activityManager, prevActivity, activity, isForward, callback) {
    const ease = 'cubic-bezier(.34,.86,.54,.99)';
    const duration = 400;
    const { enterFrom, enterTo, exitFrom, exitTo } = getTransition(isForward, isForward ? activity.transition : prevActivity.transition);

    const { className: enterFromClassName, ...enterFromStyle } = enterFrom;
    const { className: enterToClassName, ...enterToStyle } = enterTo;
    const { className: exitFromClassName, ...exitFromStyle } = exitFrom;
    const { className: exitToClassName, ...exitToStyle } = exitTo;

    prevActivity.$el.removeClass('app-view-actived');

    const outAnimTask = new Promise((resolve, reject) => {
        const $prevElement = $(prevActivity.el).css(castStyle(exitFromStyle));
        if (exitFromClassName) $prevElement.addClass(exitFromClassName);
        prevActivity.page.trigger('beforehide');
        $prevElement.animate(castStyle(exitToStyle), duration, ease, () => {
            prevActivity.el.style.zIndex = '';
            prevActivity.page.trigger('hide');
            if (!isForward) {
                disposeUselessActivities(activityManager, prevActivity, activity);
            } else {
                prevActivity.pause();

                let prev = prevActivity._prev;
                let count = 1;
                while (prev) {
                    if (count >= activityManager.options.maxActivePages) {
                        disposeActivity(activityManager, prev);
                    }
                    prev = prev._prev;
                    count++;
                }
            }
            resolve();
        });
        if (exitToClassName) $prevElement.addClass(exitToClassName);
    });

    const inAnimTask = new Promise((resolve, reject) => {
        const $currentElement = $(activity.el).css(castStyle(enterFromStyle));
        if (enterFromClassName) $currentElement.addClass(enterFromClassName);
        activity.page.trigger('beforeshow');
        $currentElement.animate(castStyle(enterToStyle), duration, ease, () => {
            activity.el.style.zIndex = '';
            outAnimTask.then(() => {
                activity.show();
            });
            activityManager.application.prevActivity = activity._prev;
            resolve();
            activity.scrollTop && window.scrollTo(0, activity.scrollTop);
        });
        if (enterToClassName) $currentElement.addClass(enterToClassName);
    });

    return Promise.all([outAnimTask, inAnimTask]).then(() => {
        callback && callback();
    });
}

function disposeActivity(activityManager, item) {
    var { activitiesCache } = activityManager;
    var index = activitiesCache.findIndex((one) => one === item);
    if (index !== -1) {
        activitiesCache.splice(index, 1);
    }
    item.destroy();
}

function disposeUselessActivities(activityManager, prevActivity, activity) {
    disposeActivity(activityManager, prevActivity);

    var nextActivity = activity._next;
    var temp;

    while (nextActivity && nextActivity !== activity) {
        if (prevActivity !== nextActivity) {
            disposeActivity(activityManager, nextActivity);
        }
        temp = nextActivity;
        nextActivity = nextActivity._next;
        temp._next = null;
    }
}

export const renderActivity = function (controllerClass, props, container, cb) {
    const location = (props && props.location) || {};
    const activity = createActivityFromModule(controllerClass, location, {
        rootElement: container
    })
        .setTransitionTask(Promise.resolve())
        .setProps({
            location,
            ...props
        }, cb);

    activity.$el.css({
        opacity: 1,
        display: 'block',
        '-webkit-transform': 'translate3d(0%,0%,0)'
    });
    activity.show();

    const wrapper = {
        destroy() {
            activity.destroy();
            return wrapper;
        },
        setState(state, cb) {
            activity.setProps(state, cb);
            return wrapper;
        },
        get $el() {
            return activity.$el;
        }
    };
    return wrapper;
};