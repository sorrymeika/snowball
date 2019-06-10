import { castStyle, Animation } from '../../graphics/animation';
import { Toucher, loader } from '../../widget';
import { $, isThenable } from '../../utils';

import { CONTROLLER } from '../decorators/symbols';
import { IApplication, IActivityManager } from '../types';

import Activity from './Activity';

const ANIMATION = {
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

function getAnimation(isForward) {
    var type = isForward ? "open" : "close",
        enterFrom = Object.assign({}, ANIMATION[type + 'EnterAnimationFrom']),
        exitFrom = Object.assign({}, ANIMATION[type + 'ExitAnimationFrom']);

    enterFrom.zIndex = isForward ? ANIMATION.openEnterZIndex : ANIMATION.closeEnterZIndex;
    enterFrom.display = 'block';
    exitFrom.zIndex = isForward ? ANIMATION.openExitZIndex : ANIMATION.closeExitZIndex;
    exitFrom.display = 'block';

    return {
        enterFrom,
        enterTo: ANIMATION[type + 'EnterAnimationTo'],
        exitFrom: exitFrom,
        exitTo: ANIMATION[type + 'ExitAnimationTo']
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

function replaceActivityWithAnimation(activityManager, prevActivity, activity, callback) {
    var ease = 'cubic-bezier(.34,.86,.54,.99)';
    var isForward = activity.isForward;
    var duration = 400;
    var { enterFrom, enterTo, exitFrom, exitTo } = getAnimation(isForward);

    prevActivity.$el.removeClass('app-view-actived');

    var $prevElement = $(prevActivity.el).css(castStyle(exitFrom));
    var $currentElement = $(activity.el).css(castStyle(enterFrom));

    var outAnimTask = new Promise((resolve, reject) => {
        $prevElement.animate(castStyle(exitTo), duration, ease, () => {
            prevActivity.el.style.zIndex = '';
            if (!isForward) {
                disposeUselessActivities(activityManager, prevActivity, activity);
            } else {
                prevActivity.pause();
            }
            resolve();
        });
    });

    var inAnimTask = new Promise((resolve, reject) => {
        $currentElement.animate(castStyle(enterTo), duration, ease, () => {
            activity.el.style.zIndex = '';
            outAnimTask.then(() => {
                activity.show();
            });
            activityManager.application.prevActivity = activity._prev;
            resolve();
            activity.scrollTop && window.scrollTo(0, activity.scrollTop);
        });
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
async function createActivity(route, location, application) {
    let viewFactory = route.viewFactory;

    if (isThenable(viewFactory)) {
        loader.showLoader();
        route.viewFactory = viewFactory = await viewFactory;
        loader.hideLoader();
    }

    viewFactory = viewFactory.default || viewFactory;
    viewFactory = viewFactory[CONTROLLER]
        ? viewFactory[CONTROLLER]
        : viewFactory;

    return viewFactory.__is_activity_factory__
        ? viewFactory(location, application)
        : new Activity(viewFactory, location, application);
}


export default class ActivityManager implements IActivityManager {

    application: IApplication;

    constructor(application, options) {
        this.activitiesCache = [];
        this.options = options;
        this.application = application;
        this.bindBackGesture(application.rootElement, application);
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
                    var anim = getAnimation(isForward);

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
                    application.then(() => gestureEnd);
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
        for (var i = this.activitiesCache.length - 1; i >= 0; i--) {
            if (this.activitiesCache[i].location.path === path) {
                return this.activitiesCache[i];
            }
        }
        return null;
    }

    async getOrCreate(route, location, forceCreate: boolean): Activity {
        var activity;

        if (forceCreate || !(activity = this.findLatest(location.path))) {
            activity = await createActivity(route, location, this.application);
            this.activitiesCache.push(activity);
        }

        return activity;
    }

    /**
     * 页面切换
     * @param {Activity} prevActivity 当前要被替换掉的页面
     * @param {Activity} activity 当前要切换到的页面
     * @param {boolean}  withAnimation 是否带动画
     * @param {object} intentProps 传给下个页面的props
     */
    replaceActivity(prevActivity, activity, withAnimation, intentProps) {
        var application = this.application;

        activity.$el.siblings('.app-view').each(function () {
            if (!prevActivity || this !== prevActivity.el) {
                this.style.display = 'none';
            }
        });

        var next;
        var replacingTask = new Promise((resolve) => {
            var initialCount = 2;

            next = () => {
                initialCount--;
                if (initialCount === 0) {
                    resolve();
                } else {
                    if (application.isStarting) {
                        console.timeEnd("Start React App spend");
                        application.isStarting = false;
                    }
                    console.log('%copen:%c ' + activity.location.path + ' %c total time', 'border-radius:2px;padding:0 2px;background:green;color:#fff', 'color:#000', 'color:green', Date.now() - application.now + 'ms');
                }
            };
        });

        activity
            .setAnimationTask(replacingTask)
            .setProps({
                location: activity.location,
                ...intentProps
            }, next);

        if (prevActivity && prevActivity.location.path === activity.location.path) {
            next();
            return replacingTask;
        }

        if (prevActivity && withAnimation) {
            replaceActivityWithAnimation(this, prevActivity, activity, next);
        } else {
            activity.$el.css({
                opacity: 1,
                display: 'block',
                '-webkit-transform': 'translate3d(0%,0%,0)'
            });

            activity.show(!prevActivity
                ? next
                : () => {
                    prevActivity.$el.removeClass('app-view-actived');
                    prevActivity.$el.css({ zIndex: '' });
                    disposeUselessActivities(this, prevActivity, activity);
                    next();
                });
        }

        return replacingTask;
    }
}
