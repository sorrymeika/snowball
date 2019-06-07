/**
 * 功能: 单页间跳转
 * 作者: sunlu
 */

import * as appsdk from '../../appsdk';
import * as env from '../../env';
import { IApplication, INavigation } from '../types';
import { $, appendQueryString, session } from '../../../utils';

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

export default class Navigation implements INavigation {

    constructor(application: IApplication) {
        this.application = application;
        this.id = session('SNOWBALL_NAVIGATION_ID') || 0;
        this.history = [location.hash.replace(/^#/, '') || '/'];
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
                var navigateEvent = createEvent('beforenavigate');
                $window.trigger(navigateEvent);
                if (navigateEvent.isDefaultPrevented()) return;

                var historyUrls = this.history;
                var url = location.hash.replace(/^#/, '') || '/';
                var isBack = historyUrls[historyUrls.length - 2] === url;
                if (isBack || mayBeBack) {
                    var beforeBackEvent = createEvent('beforeback');
                    $window.trigger(beforeBackEvent);
                    if (beforeBackEvent.isDefaultPrevented()) {
                        this.ignoreHashChangeCount++;
                        history.forward();
                        return;
                    }
                }

                if (isBack) {
                    historyUrls.pop();
                    this.application.navigate(url, {
                        isForward: false,
                        withAnimation: true
                    });
                } else {
                    historyUrls.length = 0;
                    this.application.navigate(url, {
                        withAnimation: false
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
    forward(url, props) {
        this.transitionTo(url, NavigateType.Forward, props);
        return this;
    }

    /**
     * 带返回动画的页面跳转
     *
     * @param {string} [url] 跳转连接，不填默认返回referrer
     * @param {object} [props] 传给下个页面的props
     */
    back(url, props?, withAnimation = true) {
        const { application } = this;
        var backUrl = url || (application.currentActivity._prev && application.currentActivity._prev.location.url);
        if (backUrl) {
            this.transitionTo(backUrl, NavigateType.Back, props, withAnimation);
        } else {
            if (env.IS_PAJK || env.IS_JSB || env.IS_SHOUXIAN || env.IS_HCZ || env.IS_HRX || env.IS_CBW) {
                if (closeWebViewTimer) clearTimeout(closeWebViewTimer);
                closeWebViewTimer = setTimeout(() => {
                    this.application.currentActivity && this.application.currentActivity.destroy();
                    appsdk.exitWebView();
                }, 600);

                $(window).on('hashchange popstate unload', () => {
                    if (closeWebViewTimer) {
                        clearTimeout(closeWebViewTimer);
                        closeWebViewTimer = null;
                    }
                });
            }
            history.back();
        }
        return this;
    }

    /**
     * 直接返回到native首页
     */
    home() {
        appsdk.exitWebView();
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
    async transitionTo(url, navigateType, props, withAnimation) {
        const { application } = this;

        await application.navigationTask;

        if (/^(https?:)?\/\//.test(url)) {
            if (isReplaceHistory(navigateType)) {
                if (history.length > 1 && env.iOS) {
                    setTimeout(() => {
                        location.href = 'redirect.html?go=-2&time=' + Date.now() + '&url=' + encodeURIComponent(url);
                    }, 0);
                } else {
                    location.replace(url);
                }
            } else {
                location.href = url;
            }
            return;
        }

        if (typeof navigateType === 'object') {
            withAnimation = props;
            props = navigateType;
            navigateType = undefined;
        }

        var isReplace = isReplaceHistory(navigateType);

        url = url.replace(/^#/, '') || '/';
        if (url.startsWith('?')) {
            url = (application.currentActivity ? application.currentActivity.location.path : '/') + url;
        }

        var currentUrl = application.currentActivity ? application.currentActivity.location.url : null;
        var index = this.history.lastIndexOf(url);
        var currIndex = this.history.lastIndexOf(currentUrl);

        if (currIndex === index && currIndex !== -1) {
            return;
        } else {
            if (withAnimation == null) {
                withAnimation = !isReplace && navigateType !== undefined;
            }

            var isForward = navigateType === undefined
                ? (index === -1 || index > currIndex)
                : isReplace
                    ? undefined
                    : navigateType === NavigateType.Forward;

            if (isForward && index !== -1) {
                url = appendQueryString(url, { _rid: ++this.id });
                session('SNOWBALL_NAVIGATION_ID', this.id);
            }

            var navigateSuccess = await application.navigate(url, {
                isForward,
                withAnimation,
                beforeNavigate: () => {
                    this.ignoreHashChangeCount++;
                    if (isReplace) {
                        this.history[this.history.length - 1] = url;
                        location.replace('#' + url);
                    } else if (!isForward && index !== -1) {
                        this.history.length = index + 1;
                        history.go(index - currIndex);
                    } else {
                        this.history.length = currIndex + 1;
                        if (currIndex == -1 && currentUrl)
                            this.history.push(currentUrl);
                        this.history.push(url);

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