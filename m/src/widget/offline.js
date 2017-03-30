var $ = require('$');
var Component = require('core/component');

var Offline = Component.extend({
    el: '<div class="viewport offline" sn-transition-end="this._hide()">\
        <div class="offline_con">\
            <div class="ico"></div>\
            <div class="txt">您的网络不太顺畅哦</div>\
            <div class="txt_sub">请检查您的手机是否联网</div>\
            <div class="btn" sn-click="this.reload()">重新加载</div>\
        </div>\
    </div>',

    reload: function () {
    },

    initialize: function () {
        //this.listenTo(this.$el, $.fx.transitionEnd, this._hide);
        this.$el.appendTo('body');
    },

    show: function (reload) {
        this.$el.show()[0].clientHeight;
        this.$el.addClass('show');

        if (typeof reload == 'function') {
            this.reload = reload;
        }
    },

    _hide: function () {
        !this.$el.hasClass('show') && this.$el.hide();
    },

    hide: function () {
        this.$el.removeClass('show');
    }
});

var instance;

Offline.getInstance = function () {

    if (!instance) {
        instance = new Offline();
    }
    return instance;
};

module.exports = Offline;