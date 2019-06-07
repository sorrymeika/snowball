/**
 * 作者: sunlu
 * 用途: 元素滚动，下拉刷新，图片懒加载
 * 默认使用原生滚动，并让停止滚动时的点击不向上冒泡
 * 不支持原生滚动的os，使用transform方式滚动
 */

import { iOS, android, osVersion, IS_SNOWBALL_WEBVIEW } from "../env";

import Touch from "../core/touch";
import { $ } from "../core/dom";

import { computeFrame, animate } from "../graphics/animation";
import util from "../core/util";

function insertScroller($el) {
    var $scroller = $el.children(".app-scroller-container");
    return $scroller.length
        ? $scroller
        : $('<div class="app-scroller-container" style="width:100%;"></div>')
            .append($el.children())
            .appendTo($el.html(""));
}

const TOUCH_AVAILABLE = 'ontouchstart' in document.body;

export function ScrollView(el, options) {
    var self = this;

    self.options = options = $.extend({}, self.options, options);

    self.$el = $(el).css({ overflow: "hidden" });
    self.el = self.$el[0];
    self.$scroller = insertScroller(self.$el);
    self.scroller = self.$scroller[0];

    var toucher = new Touch(self.$el, {
        enableVertical: options.vScroll,
        enableHorizontal: options.hScroll
    });
    self.touch = toucher;

    var clientWidth;
    var clientHeight;
    var scrollWidth;
    var scrollHeight;

    toucher
        .on("start", function () {
            clientWidth = self.el.clientWidth;
            clientHeight = self.el.clientHeight;
            scrollWidth = self.scroller.offsetWidth;
            scrollHeight = self.scroller.offsetHeight;

            toucher.maxY = Math.max(
                self.scroller.offsetHeight - clientHeight,
                0
            );

            if (options.hScroll) {
                self.$scroller.css({ overflowX: "auto" });
                self.scroller.style.width = scrollWidth + "px";
                toucher.maxX = Math.max(scrollWidth - self.el.clientWidth, 0);
            }
        })
        .on("move", function () {
            self.scroller.style.transform = self.scroller.style.webkitTransform =
                "translate3d(" + toucher.x * -1 + "px," + toucher.y * -1 + "px,0)";
            options.onScroll && options.onScroll({
                target: self.el,
                x: toucher.x,
                y: toucher.y,
                width: clientWidth,
                height: clientHeight,
                scrollHeight,
                scrollWidth
            });
        })
        .on("stop", function () {
            self.$el.trigger("scrollStop", {
                x: toucher.x,
                y: toucher.y,
                width: clientWidth,
                height: clientHeight,
                scrollHeight,
                scrollWidth
            });
        });
};

ScrollView.prototype = {
    scrollTo: function (x, y, duration, callback) {
        this.touch.trigger("start")
            .scrollTo(x, y, duration, callback);
    },

    scrollHeight: function () {
        return this.scroller.offsetHeight;
    },

    scrollTop: function () {
        return this.touch.y;
    },

    scrollToEnd: function (duration) {
        this.scrollTo(0, this.scroller.offsetHeight, duration);
    },

    destroy: function () {
        this.el.__widget_scroll__ = null;
        this.touch.destroy();
    }
};

ScrollView.insertScroller = insertScroller;

function pullToRefreshStart(e) {
    var pullToRefresh = this.__widget_pullToRefresh__;

    if (
        !(this.__widget_scroll__ instanceof ScrollView) &&
        this.parentNode.scrollTop !== 0
    ) {
        pullToRefresh.isStop = true;
    } else {
        var point = e.touches[0],
            matrix = pullToRefresh.$scroller.matrix();

        pullToRefresh.isStart = false;
        pullToRefresh.isStop = false;
        pullToRefresh.isMoved = false;
        pullToRefresh.sy = pullToRefresh.oy = pullToRefresh.pointY =
            point.pageY;
        pullToRefresh.sx = point.pageX;
        pullToRefresh.st = matrix.ty;
        pullToRefresh.isLoading = pullToRefresh.isDataLoading;
    }
}

function pullToRefreshMove(e) {
    var pullToRefresh = this.__widget_pullToRefresh__;

    if (pullToRefresh.isStop) return;

    var point = e.touches[0],
        deltaY = point.pageY - pullToRefresh.sy,
        deltaX = point.pageX - pullToRefresh.sx;

    pullToRefresh.oy = pullToRefresh.pointY;
    pullToRefresh.pointY = point.pageY;

    if (!pullToRefresh.isStart) {
        pullToRefresh.isStart = true;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            pullToRefresh.isStop = true;
            return;
        }
    }

    if (this.__widget_scroll__.scrollTop() <= 0 && deltaY > 0) {
        pullToRefresh.isMoved = true;
        pullToRefresh.refreshAgain = true;
        pullToRefresh.ty = pullToRefresh.st + deltaY * 0.5;

        pullToRefresh.$scroller.css({
            "-webkit-transform":
                "translate(0px," + pullToRefresh.ty + "px) translateZ(0)"
        });

        if (!pullToRefresh.isLoading) {
            pullToRefresh.$refresh.html(
                pullToRefresh.ty > 70 ? "释放刷新" : "下拉刷新"
            );
        }
    } else {
        pullToRefresh.isStop = true;
    }
    return pullToRefresh.isStop;
}

function pullToRefreshEnd(e) {
    var pullToRefresh = this.__widget_pullToRefresh__;
    var el = this;

    if (pullToRefresh.isMoved) {
        var point = e.changedTouches[0],
            from = pullToRefresh.ty,
            end = from > 70 ? 50 : 0,
            dy = pullToRefresh.oy - point.pageY,
            bounce = function () {
                pullToRefresh.$scroller.animate(
                    {
                        "-webkit-transform":
                            "translate(0px," + end + "px) translateZ(0)"
                    },
                    300 + dy * -1,
                    "cubic-bezier(.3,.78,.43,.95)",
                    function () {
                        pullToRefresh.refreshAgain = false;
                        if (!pullToRefresh.isLoading && end !== 0) {
                            pullToRefresh.isLoading = pullToRefresh.isDataLoading = true;
                            pullToRefresh.$refresh.html(
                                '<div class="dataloading"></div>'
                            );
                            $(el).triggerHandler("refresh");
                        }
                    }
                );
            };

        pullToRefresh.isMoved = false;

        if (pullToRefresh.isLoading && !pullToRefresh.isDataLoading) {
            end = 0;
        }
        if (dy < -5) {
            pullToRefresh.$scroller.animate(
                {
                    "-webkit-transform":
                        "translate(0px," +
                        (from - dy * 1.5) +
                        "px) translateZ(0)"
                },
                dy * -1.5,
                "cubic-bezier(.3,.78,.43,.95)",
                bounce
            );
        } else bounce();

        return false;
    }
}

function pullToRefreshRelease() {
    var pullToRefresh = this.__widget_pullToRefresh__;

    var complete = function () {
        pullToRefresh.$refresh.html("下拉刷新");
        pullToRefresh.isDataLoading = false;
        if (pullToRefresh.refreshAgain) return;

        var from = pullToRefresh.$scroller.matrix().ty,
            end = Math.max(from - 50, 0);

        pullToRefresh.$scroller.animate(
            {
                "-webkit-transform":
                    "translate(0px," + end + "px) translateZ(0)"
            },
            400,
            "cubic-bezier(.3,.78,.43,.95)"
        );
    };

    pullToRefresh.options.pullToRefresh.call(this, complete, function (error) {
        complete();
    });
}

var touchStartEvent = {};

function Scroll(el, options) {
    var $el = $(el);
    if (iOS) {
        $el.css({
            "-webkit-overflow-scrolling": "touch",
            "overflow-scrolling": "touch",
            overflowY: options.vScroll ? "scroll" : "",
            overflowX: options.hScroll ? "scroll" : ""
        });
    } else {
        $el.css({
            overflowY: options.vScroll ? "auto" : "",
            overflowX: options.hScroll ? "auto" : ""
        });
    }

    this._scrollStop = util.debounce(() => {
        if (
            !this.__params ||
            this.__params.x !== this.scrollLeft ||
            this.__params.y !== this.scrollTop
        ) {
            var el = this.el;
            if (this.watingForNextScrollStop && Date.now() - this._touchEndTimeStamp > 120) {
                this.watingForNextScrollStop = false;
            }
            $(el).trigger("scrollStop", (this.__params = {
                x: el.scrollLeft,
                y: el.scrollTop,
                ...this._rect
            }));
        }
    }, 80);

    this._touchStart = this._touchStart.bind(this);
    this._touchMove = this._touchMove.bind(this);
    this._touchEnd = this._touchEnd.bind(this);
    this._preventClick = this._preventClick.bind(this);
    this._scroll = this._scroll.bind(this);
    this._scrollTop = 0;
    this._timestamp = 0;
    this.options = options;
    this.el = el;
    this.$el = $el;

    $el.on("touchstart", this._touchStart)
        .on("touchmove", this._touchMove)
        .on("touchend", this._touchEnd)
        .on("click", this._preventClick)
        .on("scroll", this._scroll);
}

Scroll.prototype = {
    _touchStart(e) {
        var point = e.touches[0],
            now = Date.now();

        if (e.touches.length === 2) {
            this._isStop = true;
            return;
        }

        touchStartEvent = e;

        e.scrolling = false;
        e.startTime = now;

        if (!e.scrollSource) {
            e.scrollSource = this;
            e.isHoldScroll = now - this._timestamp <= 32;
        }

        var el = this.el;

        this._sy = this._lastY = this._y = point.pageY;
        this._sx = point.pageX;
        this._isMomentum = false;
        this._isMoved = false;
        this._isStart = false;
        this._isStop = false;
        this._isPreventScroll = false;
        this._isScroll = false;
        this._hasMoved = false;
        this._rect = {
            width: el.clientWidth,
            height: el.clientHeight,
            scrollHeight: el.scrollHeight,
            scrollWidth: el.scrollWidth
        };
    },

    _touchMove(e) {
        this._hasMoved = true;

        if (this._isStop) return;

        e.isHoldScroll = touchStartEvent.isHoldScroll;

        var point = e.touches[0],
            pointY = point.pageY,
            deltaY = pointY - this._sy,
            deltaX = point.pageX - this._sx;

        this._lastY = this._y;
        this._y = pointY;

        if (!this._isStart) {
            this._isStart = true;
            if (
                (this.options.vScroll &&
                    !this.options.hScroll &&
                    Math.abs(deltaX) >= Math.abs(deltaY)) ||
                (!this.options.vScroll &&
                    this.options.hScroll &&
                    Math.abs(deltaX) < Math.abs(deltaY))
            ) {
                this._isStop = true;
                return;
            } else {
                this._isStop = false;
            }
        }

        this._isMoved = true;
        this._isScroll = true;
        e.isFromScrollMove = true;

        if (iOS && this.el.__widget_pullToRefresh__ && this.el.scrollTop < 0) {
            this.el.__widget_pullToRefresh__.isRefresh = this.el.scrollTop < -70;
        }

        // document.cancelLongTap && document.cancelLongTap();

        // e.stopPropagation();
        this._timestamp = Date.now();
    },

    _scroll(e) {
        this._isScroll = true;
        this._timestamp = Date.now();

        if (!touchStartEvent.scrolling && !this._isMoved) {
            touchStartEvent.isHoldScroll = this._timestamp - touchStartEvent.startTime < 32;
            touchStartEvent.scrolling = true;
        }
        var x = this.el.scrollLeft;
        var y = this.el.scrollTop;
        this.options.onScroll && this.options.onScroll({
            target: this.el,
            x,
            y,
            ...this._rect
        });
        this._scrollLeft = x;
        this._scrollTop = y;
        if (this._isMomentum || android || !TOUCH_AVAILABLE) {
            this._scrollStop();
        }
        this.lastPos = {
            x,
            y
        };
    },

    _touchEnd(e) {
        var pointY = e.changedTouches[0].pageY,
            dy = Math.abs(this._lastY - pointY);

        if (this._isMoved || touchStartEvent.isHoldScroll) this._scrollStop();

        if (iOS && dy < 5) {
            this._isStop = false;
            this._isMomentum = false;
        } else {
            this._isMomentum = true;
            if (iOS && this._isScroll) {
                this._touchEndTimeStamp = Date.now();
                this.watingForNextScrollStop = true;
            }
        }

        e.cancelTap === undefined &&
            (e.cancelTap = this._isScroll || touchStartEvent.isHoldScroll);

        if ((this._isScroll && !this._isStop) || touchStartEvent.isHoldScroll) {
            // 移除长按监听
            document.cancelLongTap && document.cancelLongTap();

            if (!this._hasMoved) {
                e.stopPropagation();
                // 阻止click事件
                // e.preventDefault();
            }
        }
        this._isScroll = false;

        var pullToRefresh = this.el.__widget_pullToRefresh__;
        if (pullToRefresh && pullToRefresh.isRefresh) {
            pullToRefresh.isRefresh = false;
            pullToRefresh.$refresh.html('<div class="dataloading"></div>');
            pullToRefresh.$scroller
                .css({ "-webkit-transform": "translate(0px,50px) translateZ(0)" })
                .triggerHandler("refresh");
        }

        this.lastPos = {
            x: this.el.scrollLeft,
            y: this.el.scrollTop
        };
    },

    _preventClick(e) {
        if (TOUCH_AVAILABLE) {
            if (this.watingForNextScrollStop || (this._isScroll && !this._isStop) || touchStartEvent.isHoldScroll) {
                e.stopPropagation();
                // 阻止click事件
                e.preventDefault();
                if (this.watingForNextScrollStop) this.watingForNextScrollStop = false;
            }
        }
    },

    destroy: function () {
        this.el.__widget_scroll__ = null;
        this.$el
            .off("touchstart", this._touchStart)
            .off("touchmove", this._touchMove)
            .off("touchend", this._touchEnd)
            .off("click", this._preventClick)
            .off("scroll", this._scroll);
    },

    scrollHeight: function () {
        return this.el.scrollHeight;
    },

    scrollTop: function (y) {
        if (y !== undefined) {
            this.scrollTo(this.el.scrollLeft, y);
        }
        return this.el.scrollTop;
    },

    scrollToEnd: function (duration) {
        this.scrollTo(0, this.el.scrollHeight, duration);
    },

    scrollTo: function (x, y, duration, callback) {
        var el = this.el;

        if (duration) {
            var startX = el.scrollLeft || this._scrollLeft;
            var startY = el.scrollTop || this._scrollTop;

            var distX = x - startX;
            var distY = y - startY;
            var computedStyle = getComputedStyle(el, '');
            var useWindowScroll = computedStyle.overflowY === 'visible';

            animate(
                (progress) => {
                    this._scrollLeft = el.scrollLeft = startX + computeFrame(0, distX, progress);
                    this._scrollTop = el.scrollTop = startY + computeFrame(0, distY, progress);
                    useWindowScroll && window.scrollTo(this._scrollLeft, this._scrollTop);
                },
                duration,
                "ease",
                () => {
                    requestAnimationFrame(() => {
                        this._scrollStop();
                        callback && callback();
                    });
                }
            );
        } else {
            this._scrollLeft = el.scrollLeft = x;
            this._scrollTop = el.scrollTop = y;
            useWindowScroll && window.scrollTo(this._scrollLeft, this._scrollTop);
        }
    }
};

Scroll.prototype.detectImageLazyLoad = ScrollView.prototype.detectImageLazyLoad = util.throttle(function () {
    this.imageLazyLoad();
}, 80);

const lazyloadUseFadeIn = false;

if (!lazyloadUseFadeIn && iOS) {
    document.body.addEventListener('load', (e) => {
        if (e.target.nodeName === 'IMG') {
            $(e.target).removeClass('img-lazyloading');
        }
    }, true);
}

document.body.addEventListener('error', (e) => {
    var target = e.target;
    if (target.nodeName === 'IMG') {
        target.removeAttribute("src");
        target.classList.remove('img-lazyloading');
    }
}, true);

Scroll.prototype.imageLazyLoad = ScrollView.prototype.imageLazyLoad = function (
    options
) {
    var images = this.$el.find("img[data-src]");

    if (!images.length) return;

    var viewHeight = window.innerHeight * 1.2;
    var scrollElement = this.el.clientHeight !== this.el.scrollHeight
        ? this.el
        : document.documentElement.clientHeight !== document.documentElement.scrollHeight
            ? document.documentElement
            : document.body;
    var isScrollToBottom = scrollElement.clientHeight + scrollElement.scrollTop >= scrollElement.scrollHeight;

    images.each((i, img) => {
        if (img.src) {
            img.classList.remove('img-lazyloading');
        }
        var src = img.getAttribute("data-src");
        if (!src || src == img.src) {
            img.removeAttribute("data-src");
            return;
        }

        if (isScrollToBottom || img.getBoundingClientRect().top < viewHeight) {
            img.src = src;
            img.removeAttribute("data-src");

            if (!img.complete) {
                if (lazyloadUseFadeIn) {
                    var $img = $(img);
                    function onload() {
                        setTimeout(() => {
                            $img.animate({
                                opacity: 1
                            }, 300, () => {
                                $img.removeClass('img-lazyloading');
                            });
                        }, 0);
                        complete();
                    }

                    function onerror() {
                        complete();
                    }

                    function complete() {
                        $img.off('load', onload)
                            .off('error', onerror);
                    }

                    $img
                        .addClass('img-lazyloading')
                        .on('load', onload)
                        .on('error', onerror);
                } else {
                    iOS && img.classList.add('img-lazyloading');
                }
            }
        }
    });
};

function ScrollBindResult() {
    this.items = [];
}

ScrollBindResult.prototype = {
    concat: function (scrollBindResult) {
        for (var i = 0, j = scrollBindResult.items.length; i < j; i++) {
            this.items.push(scrollBindResult.items[i]);
        }
    },

    get: function (el) {
        if (typeof el === "number") return this.items[el];

        return this.items.find(
            typeof el === "string"
                ? function (item) {
                    return item.$el.filter(el).length > 0;
                }
                : function (item) {
                    return item.el === el;
                }
        );
    },

    add: function (item) {
        this.items.push(item);
    },

    eq: function (i) {
        return this.items[i];
    },

    destroy: function () {
        this.items.forEach(function (item) {
            item.destroy();
        });
    }
};

exports.get = function (el) {
    return el.__widget_scroll__;
};

/**
 * 给Element元素绑定Scroll
 *
 * @param {String|Element|Zepto} selector
 * @param {Object} options
 * @param {Function} options.pullToRefresh 下拉刷新触发时调用的方法
 * @param {boolean} options.vScroll 是否允许垂直方向滚动
 * @param {boolean} options.hScroll 是否允许水平方向滚动
 *
 * @return {ScrollBindResult}
 *
 * @example
 * exports.bind({
 *      pullToRefresh: function(resolve, reject) {
 *          setTimeout(function() {
 *              reject('出错啦');
 *          },1000);
 *      }
 * })
 */
export function bind(selector, options) {
    options = Object.assign(
        {
            vScroll: true,
            hScroll: false,
            useTransform: false
        },
        options
    );
    var result = new ScrollBindResult();

    $(selector).each(function () {
        var el = this;
        var scrollView = el.__widget_scroll__;

        if (scrollView) {
            result.add(scrollView);
            return;
        }

        var $el = $(el).addClass("scrollview");
        el.__widget_scroll__ = scrollView = (options && options.useTransform) || (android && parseFloat(osVersion <= 2.3))
            ? new ScrollView(el, options)
            : new Scroll(el, options);

        const detectors = [];
        const addScrollingDetector = (detector) => {
            if (typeof detector !== "function") return;
            let lastTime = 0;
            const fn = (opts) => {
                const now = Date.now();
                if (now - lastTime > 100) {
                    detector(opts);
                    lastTime = now;
                }
            };
            fn.detector = detector;
            detectors.push(fn);
        };

        const oldOnScroll = options.onScroll;
        options.onScroll = (opts) => {
            oldOnScroll && oldOnScroll(opts);
            for (let i = 0; i < detectors.length; i++) {
                detectors[i](opts);
            }
        };

        const scrollStopDetectors = [];
        $el.on("scrollStop", function (e, opts) {
            for (let i = 0; i < detectors.length; i++) {
                detectors[i].detector(opts);
            }
            for (let i = 0; i < scrollStopDetectors.length; i++) {
                scrollStopDetectors[i](opts);
            }
        });

        addScrollingDetector((opts) => scrollView.imageLazyLoad(opts));

        if (typeof options.onScrollToTop === "function") {
            scrollStopDetectors.push((opts) => {
                if (opts.y <= 10) {
                    options.onScrollToTop();
                }
            });
        }

        if (typeof options.onScrollToBottom === "function") {
            addScrollingDetector((opts) => {
                if (opts.y + opts.height + 10 >= opts.scrollHeight) {
                    options.onScrollToBottom(opts);
                }
            });
        }

        if (android && IS_SNOWBALL_WEBVIEW) {
            $el.on(
                "focus touchend",
                "input:not(readonly),textarea:not(readonly)",
                function (e) {
                    setTimeout(function () {
                        var node = e.currentTarget;
                        if (document.activeElement === node) {
                            var offsetTop = 0;
                            do {
                                offsetTop += node.offsetTop;
                                node = node.offsetParent;
                            } while (node && el !== node && !$.contains(node, el));

                            var bottomHeight = 90;

                            if (scrollView.scrollTop() + el.clientHeight - bottomHeight < offsetTop) {
                                var y = offsetTop - el.clientHeight + bottomHeight;
                                scrollView.scrollTo(0, y);
                            }
                        }
                    }, 300);
                }
            );
        }

        if (options && options.pullToRefresh) {
            var $scroller = $el.children(".app-scroller-container");
            var $refresh = $el.children(".app-scroller-pull-to-refresh");

            if (!$scroller.length) $scroller = ScrollView.insertScroller($el);
            if (!$refresh.length)
                $refresh = $(
                    '<div class="app-scroller-pull-to-refresh" style="height:50px;text-align:center;line-height:50px;">下拉刷新</div>'
                ).prependTo($scroller);

            $scroller.css({ marginTop: -50 });

            el.__widget_pullToRefresh__ = {
                $refresh: $refresh,
                $scroller: $scroller,
                options: options
            };
            $el
                .on("touchstart", pullToRefreshStart)
                .on("touchmove", pullToRefreshMove)
                .on("touchend", pullToRefreshEnd)
                .on("refresh", pullToRefreshRelease);
        }

        result.add(scrollView);
    });

    return result;
};

export default { bind };