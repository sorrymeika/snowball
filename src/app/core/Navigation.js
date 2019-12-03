/**
 * 功能: 单页间跳转
 * 作者: sunlu
 */

import * as env from '../../env';
import { IApplication, INavigation } from '../types';
import { $, appendQueryString, session, isPlainObject } from '../../utils';

const NavigateType = {
    Forward: 1,
    Back: -1,
    Replace: 0,
    Unknow: 2
};

let closeWebViewTimer;

function isReplaceHistory(navigateType) {
    return navigateType == NavigateType.Replace;
}

let isNavigateListenerStart = false;

class History {
    constructor(url) {
        this.data = [{
            url
        }];
    }

    get length() {
        return this.data.length;
    }

    set length(val) {
        this.data.length = val;
    }

    add(url, withTransition = true) {
        this.data.push({
            url,
            withTransition
        });
        return this;
    }

    set(index, url, withTransition = true) {
        this.data[index] = {
            url,
            withTransition
        };
        return this;
    }

    lastIndexOf(url) {
        for (let i = this.data.length - 1; i >= 0; i--) {
            if (this.data[i].url === url) {
                return i;
            }
        }
        return -1;
    }

    get(index) {
        return this.data[index];
    }

    pop() {
        return this.data.pop();
    }
}

export default class Navigation implements INavigation {

    constructor(application: IApplication, options) {
        this.options = options;
        this.application = application;
        this.id = session('SNOWBALL_NAVIGATION_ID') || 0;
        this.history = new History(location.hash.replace(/^#/, '') || '/');
        this.ignoreHashChangeCount = 0;
    }

    startNavigateListener() {
        if (isNavigateListenerStart) {
            throw new Error('NavigateListener is already start!');
        }
        isNavigateListenerStart = true;

        const $window = $(window);
        const createEvent = $.Event;
        let historyLength = history.length;

        $window.on('hashchange', () => {
            this.hashChangeTime = Date.now();
            const mayBeBack = historyLength === history.length;
            historyLength = history.length;

            if (this.ignoreHashChangeCount <= 0) {
                const navigateEvent = createEvent('beforenavigate');
                $window.trigger(navigateEvent);
                if (navigateEvent.isDefaultPrevented()) return;

                const historyRecords = this.history;
                const url = location.hash.replace(/^#/, '') || '/';
                const prev = historyRecords.get(historyRecords.length - 2);
                const isBack = prev && prev.url === url;
                if (isBack || mayBeBack) {
                    var beforeBackEvent = createEvent('beforeback');
                    $window.trigger(beforeBackEvent);
                    if (beforeBackEvent.isDefaultPrevented()) {
                        this.ignoreHashChangeCount++;
                        // 避免两次hashchange过于接近产生未知问题
                        setTimeout(() => {
                            history.forward();
                        }, 500);
                        return;
                    }
                }

                if (isBack) {
                    const current = historyRecords.pop();
                    this.application.navigate(url, {
                        isForward: false,
                        withTransition: current.withTransition
                    });
                } else {
                    historyRecords.length = 0;
                    this.application.navigate(url, {
                        withTransition: false
                    });
                }
            } else {
                this.ignoreHashChangeCount--;
            }
        });

        if (!location.hash || location.hash === '#') {
            this.ignoreHashChangeCount++;
            location.hash = '/';
        }
    }

    /**
     * 带前进动画的页面跳转
     *
     * @param {string} url 跳转连接
     * @param {object} [props] 传给下个页面的props
     */
    forward(url, props?, withTransition?) {
        if (typeof props === 'boolean') {
            withTransition = props;
            props = {};
        }
        this.transitionTo(url, NavigateType.Forward, props, withTransition);
        return this;
    }

    /**
     * 带返回动画的页面跳转
     *
     * @param {string} [url] 跳转连接，不填默认返回referrer
     * @param {object} [props] 传给下个页面的props
     */
    back(url, props?, withTransition?) {
        const { application } = this;
        if (isPlainObject(url)) {
            withTransition = props !== false;
            props = url;
            url = null;
        } else if (withTransition !== false) {
            withTransition = true;
        }

        const backUrl = url || (application.currentActivity._prev && application.currentActivity._prev.location.url);
        if (backUrl) {
            this.transitionTo(backUrl, NavigateType.Back, props, withTransition);
        } else {
            if (closeWebViewTimer) clearTimeout(closeWebViewTimer);
            closeWebViewTimer = setTimeout(() => {
                $(window).trigger('exitApp');
                this.application.currentActivity && this.application.currentActivity.destroy();
            }, 600);

            $(window).on('hashchange popstate unload', () => {
                if (closeWebViewTimer) {
                    clearTimeout(closeWebViewTimer);
                    closeWebViewTimer = null;
                }
            });

            history.back();
        }
        return this;
    }

    replace(url) {
        this.transitionTo(url, NavigateType.Replace);
        return this;
    }

    /**
     * 页面跳转
     *
     * @param {string} url 跳转连接
     * @param {NavigateType} [navigateType]
     * @param {object} [props] 传给下个页面的props
     */
    async transitionTo(url, navigateType, props, withTransition) {
        if (typeof navigateType === 'object') {
            withTransition = props;
            props = navigateType;
            navigateType = undefined;
        }

        const { application } = this;

        await application.navigationTask;

        if (/^(https?:)?\/\//.test(url)) {
            if (isReplaceHistory(navigateType)) {
                if (history.length > 1 && env.iOS) {
                    setTimeout(() => {
                        location.replace(url);
                    }, 0);
                } else {
                    location.replace(url);
                }
            } else {
                location.href = url;
            }
            return;
        }

        const isReplace = isReplaceHistory(navigateType);

        url = url.replace(/^#/, '') || '/';
        if (url.startsWith('?')) {
            url = (application.currentActivity ? application.currentActivity.location.path : '/') + url;
        }

        const currentUrl = application.currentActivity ? application.currentActivity.location.url : null;
        const index = this.history.lastIndexOf(url);
        const currIndex = this.history.lastIndexOf(currentUrl);

        if (currIndex === index && currIndex !== -1) {
            return;
        } else {
            if (this.options.disableTransition) {
                withTransition = false;
            } else if (withTransition == null) {
                withTransition = !isReplace && navigateType !== undefined;
            }

            const isForward = navigateType === undefined
                ? (index === -1 || index > currIndex)
                : isReplace
                    ? undefined
                    : navigateType === NavigateType.Forward;

            if (isForward && index !== -1) {
                url = appendQueryString(url, { _rid: ++this.id });
                session('SNOWBALL_NAVIGATION_ID', this.id);
            }

            const navigateSuccess = await application.navigate(url, {
                isForward,
                withTransition,
                beforeNavigate: () => {
                    if (isReplace) {
                        this.history.set(this.history.length - 1, url, withTransition);
                        if ('#' + url != location.hash) {
                            this.ignoreHashChangeCount++;
                        }
                        location.replace('#' + url);
                    } else if (!isForward && index !== -1) {
                        this.history.length = index + 1;
                        this.ignoreHashChangeCount++;
                        history.go(index - currIndex);
                    } else {
                        this.history.length = currIndex + 1;
                        if (currIndex == -1 && currentUrl)
                            this.history.add(currentUrl, withTransition);
                        this.history.add(url, withTransition);

                        if ('#' + url != location.hash) {
                            this.ignoreHashChangeCount++;
                        }
                        if (Date.now() - application.hashChangeTime < 500) {
                            // 两次hashchange间隔小于500ms容易不记录到history中，原理不明
                            return new Promise((resolve) => {
                                setTimeout(() => {
                                    location.hash = url;
                                    resolve();
                                }, 500);
                            });
                        } else {
                            location.hash = url;
                        }
                    }
                },
                onNavigateFailure() {
                    location.replace('#/');
                },
            }, props);

            if (!navigateSuccess) {
                console.error("route not match", url);
            }
        }
    }
}