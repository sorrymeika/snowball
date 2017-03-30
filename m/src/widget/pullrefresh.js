var $ = require('$'),
    util = require('util'),
    animation = require('../core/animation'),
    Component = require('../core/component');

var ScrollView = require('../widget/scrollview');

module.exports = Component.extend({

    events: {
        'touchstart': "touchStart",
        "touchend": "touchEnd",
        'touchmove': "touchMove"
    },

    template: '<div class="refresh" style="height:50px;text-align:center;line-height:50px;">下拉刷新</div>',

    initialize: function () {

        var $scroller = this.$el.children('.scroller_container');

        this.$scroller = !$scroller.length ? ScrollView.insertScroller(this.$el) : $scroller;
        this.$refresh = $(this.template);
    },

    render: function () {

    },

    touchStart: function (e) {
        this.isStart = false;
        this.startY = e.touches[0].pageY;
        this.isStop_iOS = util.ios && (e.currentTarget.scrollTop != 0);
    },

    touchEnd: function (e) {
        if (this.isStart) {
            var dY = e.changedTouches[0].pageY - this.startY;

            if (dY >= 70) {
                $scroller.transform({
                    translate: '0px,0px'
                });

                this.trigger('refresh');

                this.render({
                    pullTip: '下拉'
                })

            } else {
                $detailScroll.animate({
                    translate: '0px,0px'

                }, 'ease-out', 400);
            }
        }
    },

    touchMove: function (e) {
        var main = e.currentTarget;
        var dY = e.touches[0].pageY - this.startY;

        if (dY > 0 && main.scrollTop <= 0) {

            if (!this.isStart) {
                this.isStart = true;
                this.startY = e.touches[0].pageY;
                dY = 0;
            }

            if (!this.isStop_iOS) {
                if (dY >= 70) {
                    this.render({
                        pullTip: '释放'
                    })

                } else {

                    this.render({
                        pullTip: '下拉'
                    })
                }

                $scroller.transform({
                    translate: '0px,' + (dY < 0 ? 0 : dY / 2) + 'px'
                })

                return false;
            }
        }
    }
})

