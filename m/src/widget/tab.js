var $ = require('$');
var util = require('util');
var Promise = require('promise');
var Touch = require('core/touch');
var Model = require('core/model2').Model;
var Scroll = require('../widget/scroll');


function getFixedTabIndex(tab, index) {
    return index < 0 ? 0 : index >= tab.attributes.items.length ? tab.attributes.items.length - 1 : index;
}

var Tab = Model.extend({
    el: <div class="cp_tab {className}">
        <div class="cp_tab__head bottom_border">
            <ul class="cp_tab__head_con">
                <li class="cp_tab__head_item{index==i?' curr':''}" sn-repeat="item,i in items" ref="heads" sn-tap="this.tab(i)">{item}</li>
            </ul>
            <div class="cp_tab__cursor" style="width:{cursorWidth}px;-webkit-transform:translate3d({cursorX}px,0px,0px)"></div>
        </div>
        <div class="cp_tab__body" ref="body">
            <div class="cp_tab__content" style="width:{items.length*100}%" ref="content">
                <div class="cp_tab__item" style="width:{100/items.length}%" sn-repeat="item,i in items" ref="items">{this.children[i]}</div>
            </div>
        </div>
    </div>,

    attributes: {
        index: 0,
        cursorX: 0
    },

    initialize: function (data) {

        var self = this;

        this.touch = new Touch(this.refs.body, {
            enableVertical: false,
            enableHorizontal: true,
            momentum: false
        });

        this.touch.on('start', function () {

            this.minX = 0;

        }).on('move', function () {

            self.refs.content.style.webkitTransform = 'translate3d(' + this.x * -1 + 'px,' + this.y * -1 + 'px,0)';

            var x = this.x % self.wapperW;

            if (x != 0) {
                var percent = this.isMoveLeft ? x / self.wapperW : (1 - x / self.wapperW);
                var index = getFixedTabIndex(self, this.isMoveLeft ? Math.ceil(this.x / self.wapperW) : Math.floor(this.x / self.wapperW));
                var currentIndex = getFixedTabIndex(self, this.isMoveLeft ? Math.floor(this.x / self.wapperW) : Math.ceil(this.x / self.wapperW));
                if (currentIndex == index) return;

                var currentHead = self.refs.heads[currentIndex];
                var currentHeadWidth = currentHead.offsetWidth;
                var currentHeadX = currentHead.offsetLeft;

                var nextHead = self.refs.heads[index];
                var nextHeadLeft = nextHead.offsetLeft;

                self.set({
                    cursorX: currentHeadX + (nextHeadLeft - currentHeadX) * percent,
                    cursorWidth: currentHeadWidth + (nextHead.offsetWidth - currentHeadWidth) * percent
                });
            }

        }).on('end bounceBack', function (e) {

            if (e.type == 'end' && this.shouldBounceBack()) {
                return;
            }

            var index = self.attributes.index;

            index = e.type == 'bounceBack'
                ? index
                : this.isMoveLeft && this.x - this.startX > 0
                    ? index + 1
                    : !this.isMoveLeft && this.x - this.startX < 0
                        ? index - 1
                        : index;

            console.log(index, self.attributes.index, this.x, this.startX);

            self.tab(index, e.type == 'bounceBack' ? 0 : 250);
        });

        this.promise = new Promise(function (resove) {
            self.next(resove);
        });

        this.on('change:index', function (e, value) {
            this.tab(value);

        }).observe('items', function () {

            this.next(function () {

                this.refs.items.forEach(function (item) {
                    if (!item.scroll)
                        self.bindScrollTo(item);
                });

            });

        });
    },

    viewDidUpdate: function () {
        var self = this;
        this.wapperW = this.refs.body.offsetWidth;
        this.touch.maxX = this.refs.content.offsetWidth - this.wapperW;

        if (!this.attributes.cursorWidth)
            this.refs.heads[this.attributes.index] && this.set({
                cursorWidth: this.refs.heads[this.attributes.index].offsetWidth
            });
    },

    tab: function (index, duration) {
        var self = this;

        index = getFixedTabIndex(this, index);

        this.promise.then(function () {
            var scrollLeft = self.refs.body.offsetWidth * index;

            if (scrollLeft != self.touch.x) {

                self.touch.scrollTo(scrollLeft, 0, duration, function () {
                    if (index !== self.attributes.index) {
                        self.trigger('tabChange', index, self.attributes.index);
                    }
                    self.set({
                        index: index,
                        cursorX: self.refs.heads[index].offsetLeft,
                        cursorWidth: self.refs.heads[index].offsetWidth
                    });
                });
            }
        });
    }

});

module.exports = Tab;
