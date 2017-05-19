/**
 * 作者: sunlu
 * 用途: 元素滚动，下拉刷新
 * 默认使用原生滚动，并fix click点击问题
 * 不支持原生滚动的os，使用transform方式滚动
 */

var $ = require('$');
var util = require('util');
var animation = require('../core/animation');
var ScrollView = require('./scrollview');

var toast = require('./toast');

var iOS = util.iOS;
var android = util.android;
var isInApp = util.isInApp;
var osVersion = util.osVersion;

function _start(e) {
    var self = this;

    if (!(self.__widget_scroll__ instanceof ScrollView) && self.parentNode.scrollTop !== 0) {
        self.isStop = true;
    } else {
        var point = e.touches[0],
            matrix = self.$.matrix();

        self.isStart = false;
        self.isStop = false;
        self.isMoved = false;
        self.sy = self.oy = self.pointY = point.pageY;
        self.sx = point.pageX;
        self.st = matrix[5];
        self.isLoading = self.isDataLoading;
    }
}

function _move(e) {
    var self = this;

    if (self.isStop) return;

    var point = e.touches[0],
        deltaY = point.pageY - self.sy,
        deltaX = point.pageX - self.sx;

    self.oy = self.pointY;
    self.pointY = point.pageY;

    if (!self.isStart) {
        self.isStart = true;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            self.isStop = true;
            return;
        }
    }

    if (self.__widget_scroll__.scrollTop() === 0 && deltaY > 0) {
        self.isMoved = true;
        self.refreshAgain = true;
        self.ty = self.st + deltaY * .5;

        self.$.css({ '-webkit-transform': 'translate(0px,' + self.ty + 'px) translateZ(0)' });

        if (!this.isLoading) {
            self.$refresh.html(self.ty > 70 ? '释放刷新' : '下拉刷新');
        }
    } else {
        self.isStop = true;
    }
    return self.isStop;
}

function _end(e) {
    var self = this;

    if (self.isMoved) {
        var point = e.changedTouches[0],
            from = self.ty,
            end = from > 70 ? 50 : 0,
            dy = self.oy - point.pageY,
            bounce = function () {

                self.$.animate({
                    '-webkit-transform': 'translate(0px,' + end + 'px) translateZ(0)'

                }, 300 + dy * -1, 'cubic-bezier(.3,.78,.43,.95)', function () {
                    self.refreshAgain = false;
                    if (!self.isLoading && end !== 0) {
                        self.isLoading = self.isDataLoading = true;
                        self.$refresh.html('<div class="dataloading"></div>');
                        self.$.triggerHandler('refresh');
                    }
                });
            };

        self.isMoved = false;

        if (self.isLoading && !self.isDataLoading) {
            end = 0;
        }

        if (dy < -5) {
            self.$.animate({
                '-webkit-transform': 'translate(0px,' + (from - dy * 1.5) + 'px) translateZ(0)'

            }, dy * -1.5, 'cubic-bezier(.3,.78,.43,.95)', bounce);
        }
        else bounce();

        return false;
    }
}

function _refresh() {
    var self = this,
        complete = function () {
            self.$refresh.html('下拉刷新');
            self.isDataLoading = false;
            if (self.refreshAgain) return;

            var from = self.$.matrix()[5],
                end = Math.max(from - 50, 0);

            self.$.animate({
                '-webkit-transform': 'translate(0px,' + end + 'px) translateZ(0)'
            }, 400, 'cubic-bezier(.3,.78,.43,.95)');
        };

    self.options.refresh.call(this, complete, function (error) {
        toast.showToast(typeof error === 'string' ? error : error.msg);
        complete();
    });
}

var touchStartEvent = {};

function touchStart(e) {
    var el = this,
        point = e.touches[0],
        now = Date.now();

    if (e.touches.length === 2) {
        el.__isStop = true;
        return;
    }

    touchStartEvent = e;

    e.scrolling = false;
    e.startTime = now;
    e.isHoldScroll = now - el.__timestamp <= 32;

    el.__sy = el.__lastPY = el.__pointY = point.pageY;
    el.__sx = point.pageX;
    el.__hasMomentum = false;
    el.__isMoved = false;
    el.__isStart = false;
    el.__isStop = false;
    el.__isPreventScroll = false;
    el.__isScroll = false;
}

function touchMove(e) {
    if (this.__isStop) return;

    e.isHoldScroll = touchStartEvent.isHoldScroll;

    var el = this,
        point = e.touches[0],
        pointY = point.pageY,
        deltaY = point.pageY - el.__sy,
        deltaX = point.pageX - el.__sx;

    el.__lastPY = el.__pointY;
    el.__pointY = pointY;

    if (!el.__isStart) {
        el.__isStart = true;
        if ((el.options.vScroll && !el.options.hScroll && Math.abs(deltaX) > Math.abs(deltaY)) || (!el.options.vScroll && el.options.hScroll && Math.abs(deltaX) < Math.abs(deltaY))) {
            el.__isStop = true;
            return;
        } else {
            el.__isStop = false;
        }
    }

    el.__isMoved = true;
    el.__isScroll = true;

    if (iOS && el.$refresh && el.scrollTop < 0) {
        el.isRefresh = el.scrollTop < -70;
    }

    document.cancelLongTap && document.cancelLongTap();

    e.stopPropagation();
    el.__timestamp = Date.now();
}

function scrollStop(el) {
    if (el._stm) clearTimeout(el._stm);
    el._stm = setTimeout(function () {
        el._stm = null;
        if (!el.__params || el.__params.x !== el.scrollLeft || el.__params.y !== el.scrollTop) {
            $(el).trigger('scrollStop', (el.__params = {
                x: el.scrollLeft,
                y: el.scrollTop,
                width: el.clientWidth,
                height: el.clientHeight,
                scrollHeight: el.scrollHeight,
                scrollWidth: el.scrollWidth
            }));
        }
    }, 80);
}

function scroll() {
    var el = this;

    el.__isScroll = true;
    el.__timestamp = Date.now();

    if (!touchStartEvent.scrolling && !el.__isMoved) {
        touchStartEvent.isHoldScroll = el.__timestamp - touchStartEvent.startTime < 32;
        touchStartEvent.scrolling = true;
    }
    if (el.__hasMomentum || android) {
        scrollStop(el);
    }
}

function touchEnd(e) {
    var el = this,
        pointY = e.changedTouches[0].pageY,
        dy = Math.abs(el.__lastPY - pointY);

    if (el.__isMoved || touchStartEvent.isHoldScroll)
        scrollStop(el);

    if (iOS && dy < 5) {
        el.__isStop = false;
        el.__hasMomentum = false;

    } else {
        el.__hasMomentum = true;
    }

    e.cancelTap === undefined && (e.cancelTap = el.__isScroll || touchStartEvent.isHoldScroll);

    if ((el.__isScroll && !el.__isStop) || touchStartEvent.isHoldScroll) {
        // 移除长按监听
        document.cancelLongTap && document.cancelLongTap();

        e.stopPropagation();
        // 阻止click事件
        // e.preventDefault();
    }
    el.__isScroll = false;

    if (el.isRefresh) {
        el.isRefresh = false;
        el.$refresh.html('<div class="dataloading"></div>');
        el.$scroller.css({ '-webkit-transform': 'translate(0px,50px) translateZ(0)' }).triggerHandler('refresh');
    }
}

function preventClick(e) {
    var el = this;
    if ((el.__isScroll && !el.__isStop) || touchStartEvent.isHoldScroll) {
        e.stopPropagation();
        // 阻止click事件
        e.preventDefault();
    }
}

function Scroll(el, options) {
    var $el = $(el);
    if (iOS) {
        $el.css({
            '-webkit-overflow-scrolling': 'touch',
            'overflow-scrolling': 'touch',
            overflowY: options.vScroll ? 'scroll' : '',
            overflowX: options.hScroll ? 'scroll' : ''
        })
    } else if (android) {
        $el.css({
            overflowY: options.vScroll ? 'auto' : '',
            overflowX: options.hScroll ? 'auto' : ''
        });
    }

    $el.on('touchstart', touchStart)
        .on('touchmove', touchMove)
        .on('touchend', touchEnd)
        .on('click', preventClick)
        .on('scroll', scroll);

    el.options = options;
    el._scrollTop = 0;
    el.__timestamp = 0;

    this.el = el;
    this.$el = $el;
}

Scroll.prototype = {
    destroy: function () {
        this.$el.off('touchstart', touchStart)
            .off('touchmove', touchMove)
            .off('touchend', touchEnd)
            .off('scroll', scroll);
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

    scrollTo: function (x, y, duration) {
        var el = this.el;

        if (duration) {
            var startX = el.scrollLeft;
            var startY = el.scrollTop;

            var distX = x - startX;
            var distY = y - startY;

            animation.animate(function (step) {
                el._scrollLeft = el.scrollLeft = startX + animation.step(0, distX, step);
                el._scrollTop = el.scrollTop = startY + animation.step(0, distY, step);
            }, duration);
        } else {
            el._scrollLeft = el.scrollLeft = x;
            el._scrollTop = el.scrollTop = y;
        }
    }
};

Scroll.prototype.detectImageLazyLoad = ScrollView.prototype.detectImageLazyLoad = function (timeout) {
    if (this._detectTimer) clearTimeout(this._detectTimer);

    var self = this;
    this._detectTimer = setTimeout(function () {
        self._detectTimer = null;
        self.imageLazyLoad();
    }, timeout || 80);
}

Scroll.prototype.imageLazyLoad = ScrollView.prototype.imageLazyLoad = function (options) {
    var images = $('img[data-src]:not([src])', this.$el);
    if (!images.length) return;

    images.css({
        opacity: .3
    });

    var el = this.el;
    var scrollTop = options ? options.y : 0;
    var height = options ? options.height : el.clientHeight;
    var top = scrollTop + height;

    if (height === 0) return;

    images && images.each(function () {
        var src = this.getAttribute('data-src');
        if (!src) {
            this.removeAttribute('data-src');
            return;
        }

        var parent = this.offsetParent;
        var imgTop = this.offsetTop;
        while (parent && parent !== el && parent !== document.body) {
            imgTop += parent.offsetTop;
            parent = parent.offsetParent;
        }

        if (imgTop <= top + window.innerHeight / 3) {
            var $el = $(this).one('load error', function (e) {
                $el.animate({
                    opacity: 1
                }, 200);
                if (e.type === 'error') this.removeAttribute('src');
            }).attr({ src: src });
            this.removeAttribute('data-src');
        }
    });
}

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
        if (typeof el === 'number') return this.items[el];

        return this.items.find(typeof el === 'string' ? function (item) {
            return item.$el.filter(el).length > 0;

        } : function (item) {
            return item.el === el;
        });
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
}

exports.get = function (el) {
    return el.__widget_scroll__;
}

/**
 * 给Element元素绑定Scroll
 * 
 * @param {String|Element|Zepto} selector
 * @param {Object} options
 * @param {Function} options.refresh 下拉刷新触发时调用的方法 
 * @param {boolean} options.vScroll 是否允许垂直方向滚动 
 * @param {boolean} options.hScroll 是否允许水平方向滚动 
 * 
 * @return {ScrollBindResult}
 * 
 * @example
 * exports.bind({
 *      refresh: function(resolve, reject) {
 *          setTimeout(function() {
 *              reject('出错啦');
 *          },1000);
 *      }
 * })
 */
exports.bind = function (selector, options) {
    options = Object.assign({
        vScroll: true,
        hScroll: false
    }, options);

    var result = new ScrollBindResult();

    $(selector).each(function () {
        var el = this;
        if (el.__widget_scroll__) {
            result.add(el.__widget_scroll__);
            return;
        }

        var $el = $(el).addClass('scrollview');
        var scrollView = (options && options.useScroll) || (android && parseFloat(osVersion <= 2.3))
            ? new ScrollView(el, options)
            : new Scroll(el, options);

        el.__widget_scroll__ = scrollView;

        $el.on('scrollStop', function (e, options) {
            scrollView.imageLazyLoad(options);
        });

        if (isInApp) {
            $el.on('focus', 'input:not(readonly),textarea:not(readonly)', function (e) {
                setTimeout(function () {
                    var node = e.currentTarget;
                    var offsetTop = 0;
                    do {
                        offsetTop += node.offsetTop;
                        node = node.offsetParent;
                    } while (node && el !== node && !$.contains(node, el));

                    scrollView.scrollTo(0, offsetTop - (window.innerHeight / 4 - 60));
                }, 300);
            });
        }

        if (options && options.refresh) {
            var $scroller = $el.children('.scroller_container');
            if (!$scroller.length) $scroller = ScrollView.insertScroller($el);

            var $refresh = $('<div class="refresh" style="height:50px;text-align:center;line-height:50px;">下拉刷新</div>');
            var scroller = $scroller[0];

            scroller.$refresh = $refresh;
            scroller.$ = $scroller;
            scroller.options = options;

            $scroller.css({ marginTop: -50 })
                .prepend($refresh)
                .on('touchstart', _start)
                .on('touchmove', _move)
                .on('touchend', _end)
                .on('refresh', _refresh);

            this.$refresh = $refresh;
            this.$scroller = $scroller;
        }

        result.add(scrollView);
    });

    return result;
};