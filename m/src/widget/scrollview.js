var $ = require('$'),
    animation = require('core/animation'),
    Touch = require('core/touch');

var insertScroller = function ($el) {
    return $('<div class="scroller_container" style="width:100%;"></div>').append($el.children()).appendTo($el.html(''));
};

var ScrollView = function (el, options) {
    var that = this;

    that.options = options = $.extend({}, that.options, options);

    that.$el = $(el).css({ overflow: 'hidden' });
    that.el = that.$el[0];

    that.$scroller = insertScroller(that.$el);
    that.scroller = that.$scroller[0];

    this.touch = new Touch(that.$el, {
        enableVertical: options.vScroll,
        enableHorizontal: options.hScroll
    });

    this.touch.on('start', function () {
        this.maxY = Math.max(that.scroller.offsetHeight - that.el.clientHeight, 0);

        if (options.hScroll) {
            that.$scroller.css({ overflowX: 'auto' });
            var scrollWidth = that.scroller.scrollWidth;
            that.scroller.style.width = scrollWidth + 'px';
            this.maxX = Math.max(scrollWidth - that.el.clientWidth, 0);
        }

    }).on('move', function () {
        var self = this;
        that.scroller.style.webkitTransform = 'translate3d(' + self.x * -1 + 'px,' + self.y * -1 + 'px,0)';

    }).on('stop', function () {
        that.$el.trigger("scrollStop", {
            x: this.x,
            y: this.y,
            width: that.el.clientWidth,
            height: that.el.clientHeight,
            scrollHeight: that.scroller.offsetHeight,
            scrollWidth: that.scroller.offsetWidth
        });
    })
}

ScrollView.prototype = {
    scrollTo: function (x, y, duration) {
        this.touch.trigger('start').scrollTo(x, y, duration);
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

        this.touch.destroy();
    }
}


ScrollView.insertScroller = insertScroller;

module.exports = ScrollView;
