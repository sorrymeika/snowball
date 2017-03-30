var $ = require('$');
var Touch = require('core/touch');
var Event = require('core/event');

var Deletion = Event.extend(function (options) {

    var self = this;
    var events = options.events;

    !options.width && (options.width = 80);

    this.$mask = $('<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0);display:none;z-index:3000"></div>').appendTo('body').on('touchend', function (e) {
        var point = e.changedTouches[0];
        self.$mask.hide();
        self.touch.scrollTo(0, 0, 200);

        if (this._cancel) {
            return;
        }

        var el = document.elementFromPoint(point.pageX, point.pageY);
        var target = self.$target[0].parentNode;

        if (events && (target == el || $.contains(target, el))) {
            for (var key in events) {
                for (var node = el; node != target.parentNode; node = node.parentNode) {
                    if ($(node).is(key)) {
                        events[key].call(self, new Event('tap', { currentTarget: node, target: el }));
                        return false;
                    }
                }
            }
        }
    }).on('touchstart', function () {
        this._cancel = false;
    }).on('touchmove', function () {
        this._cancel = true;
    });

    this.touch = new Touch(options.el, {
        enableVertical: false,
        enableHorizontal: true,
        maxDuration: 200,
        divisorX: options.width,
        children: options.children
    });

    this.touch.on('start', function (e) {
        self.$target = $(e.currentTarget);
        this.maxX = options.width;
        this.minX = 0;

    }).on('move', function (e) {

        self.$target.css({
            "-webkit-transform": 'translate(-' + this.x + 'px,0px)'
        });

    }).on('end', function () {
        console.log('end')

        self.$mask.show();

    }).on('stop', function () {
        if (this.x != options.width && this.x != 0) {
            this.scrollTo(options.width, 0, 50);
        }
    });
});

module.exports = Deletion;