import { castStyle, Animation } from '../../graphics/animation';
import { Toucher, loader } from '../../widget';
import { $, isThenable } from '../../utils';

import { IApplication, IActivityManager, ToggleOptions } from '../types';

import Activity from './Activity';

export const ACTIVITY_CREATOR = Symbol('ACTIVITY_CREATOR');

const DEFAULT_TRANSITION = {
    openEnterZIndex: 2,
    closeEnterZIndex: 1,
    openExitZIndex: 1,
    closeExitZIndex: 3,
    openEnterAnimationFrom: {
        translate: '99%,0%'
    },
    openEnterAnimationTo: {
        translate: '0%,0%'
    },
    openExitAnimationFrom: {
        translate: '0%,0%'
    },
    openExitAnimationTo: {
        translate: '-50%,0%'
    },
    closeEnterAnimationTo: {
        translate: '0%,0%'
    },
    closeEnterAnimationFrom: {
        translate: '-50%,0%'
    },
    closeExitAnimationFrom: {
        translate: '0%,0%'
    },
    closeExitAnimationTo: {
        translate: '100%,0%'
    }
};

function getTransition(isForward, animConfig) {
    animConfig = {
        ...DEFAULT_TRANSITION,
        ...animConfig
    };
    const type = isForward ? "open" : "close",
        enterFrom = Object.assign({}, animConfig[type + 'EnterAnimationFrom']),
        exitFrom = Object.assign({}, animConfig[type + 'ExitAnimationFrom']);

    enterFrom.zIndex = isForward ? animConfig.openEnterZIndex : animConfig.closeEnterZIndex;
    enterFrom.display = 'block';
    exitFrom.zIndex = isForward ? animConfig.openExitZIndex : animConfig.closeExitZIndex;
    exitFrom.display = 'block';

    return {
        enterFrom,
        enterTo: animConfig[type + 'EnterAnimationTo'],
        exitFrom: exitFrom,
        exitTo: animConfig[type + 'ExitAnimationTo']
    };
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

/**
* 根据url获取页面组件
*
* @param {Route} 页面路由
*/
function createActivity(route, location, application) {
    let viewFactory = route.viewFactory;

    if (isThenable(viewFactory)) {
        loader.showLoader();
        return viewFactory.then((res) => {
            route.viewFactory = res;
            loader.hideLoader();
            return createActivityFromModule(res, location, application);
        });
    }

    return createActivityFromModule(viewFactory, location, application);
}

function createActivityFromModule(viewFactory, location, application) {
    viewFactory = viewFactory.default || viewFactory;

    return viewFactory[ACTIVITY_CREATOR]
        ? viewFactory[ACTIVITY_CREATOR](location, application)
        : new Activity(viewFactory, location, application);
}


export default class ActivityManager implements IActivityManager {

    application: IApplication;

    constructor(application, options) {
        this.activitiesCache = [];
        this.options = options;
        this.application = application;

        if ('ontouchmove' in document.body) {
            this.bindBackGesture(application.rootElement, application);
        }
    }

    bindBackGesture(rootElement, application) {
        var touch = new Toucher(rootElement, {
            enableVertical: false,
            enableHorizontal: true,
            momentum: false
        });

        touch
            .on('beforestart', function (e) {
                if (application.navigating || touch.triggerGestureEnd || e.touchEvent.touches[0].pageY < 80 || touch.swiper) {
                    return false;
                }
                touch.startX = touch.x = 0;
                touch.currentActivity = null;
            })
            .on('start', function (e) {
                var deltaX = touch.deltaX;
                var currentActivity = application.currentActivity;

                if (application.navigating || touch.isDirectionY || !currentActivity) {
                    e.preventDefault();
                    return;
                }

                if (touch.swiper) {
                    return;
                }

                rootElement.classList.add('app-prevent-click');

                touch.width = window.innerWidth;
                touch.minX = touch.width * -1;
                touch.maxX = 0;

                var prevActivity = currentActivity._prev;
                var leftToRight = touch.leftToRight = deltaX < 0;
                var isForward = false;

                if (prevActivity && leftToRight) {
                    var anim = getTransition(isForward);

                    touch.currentActivity = currentActivity;
                    touch.swiper = new Animation([{
                        el: currentActivity.el,
                        start: anim.exitFrom,
                        css: anim.exitTo,
                        ease: 'ease-out'
                    }, {
                        el: prevActivity.el,
                        start: anim.enterFrom,
                        css: anim.enterTo,
                        ease: 'ease-out'
                    }]);
                    const gestureEnd = new Promise((resolve) => {
                        touch.triggerGestureEnd = () => {
                            resolve();
                            touch.triggerGestureEnd = null;
                        };
                    });
                    application.whenIdle(() => gestureEnd);
                } else {
                    touch.swiper = null;
                }
            })
            .on('move', function (e) {
                if (!touch.swiper || application.navigating) return;

                var deltaX = touch.deltaX;

                touch.swiper.progress((touch.leftToRight && deltaX > 0) || (!touch.leftToRight && deltaX < 0)
                    ? 0
                    : (Math.abs(deltaX) * 100 / touch.width));

                e.preventDefault();
            })
            .on('stop', function () {
                rootElement.classList.remove('app-prevent-click');

                if (!touch.swiper) return;

                var isCancelSwipe = touch.isMoveToLeft === touch.leftToRight || Math.abs(touch.deltaX) <= 10;
                var backUrl = touch.currentActivity && touch.currentActivity._prev && touch.currentActivity._prev.location.url;

                if (isCancelSwipe || !backUrl) {
                    touch.swiper.animate(200, 0, touch.triggerGestureEnd);
                } else {
                    touch.swiper.animate(300, 100, () => {
                        touch.triggerGestureEnd();
                        application.navigation.back(backUrl, null, false);
                    });
                }

                touch.swiper = null;
            });
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

        if (prevActivity && withTransition) {
            replaceActivityWithTransition(this, prevActivity, activity, isForward, resolveTransition);
        } else {
            activity.$el.css({
                opacity: 1,
                display: 'block',
                '-webkit-transform': 'translate3d(0%,0%,0)'
            });

            activity.show(!prevActivity
                ? resolveTransition
                : () => {
                    prevActivity.$el.removeClass('app-view-actived');
                    prevActivity.$el.css({ zIndex: '' });
                    disposeUselessActivities(this, prevActivity, activity);
                    resolveTransition();
                });
        }

        return replacingTask;
    }
}

export const renderActivity = function (controllerClass, props, container, cb) {
    const location = (props && props.location) || {};
    const activity = controllerClass[ACTIVITY_CREATOR](location, {
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