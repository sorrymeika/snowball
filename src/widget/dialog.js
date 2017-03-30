var $ = require('$'),
    util = require('util'),
    view = require('./../core/component');

var mask = null;

var Dialog = view.extend({
    events: {
        'tap .js_dialog_btn': 'action',
        'tap .js_close_dialog': function () {
            this.hide();
        },
        'touchmove': function (e) {
            e.preventDefault();
        }
    },
    className: 'dialog',
    el: '<div></div>',
    template: util.template('<%if(isShowClose){%><div class="dialog-close js_close_dialog"></div><%}%><%if(isShowTitle){%><div class="dialog-title"><h3 class="js_title"><%=title%></h3></div><%}%><div class="dialog-content js_content"><%=content%></div><div class="dialog-btns"><%for(var i=0,len=buttons.length,button;i<len;i++){button=buttons[i];%><a class="dialog-btn js_dialog_btn<%=button.className?" "+button.className:" "%>"><%=button.text%></a><%}%></div>'),

    options: {
        isShowClose: false,
        isShowTitle: true,
        title: null,
        content: null,
        buttons: []
    },

    title: function (title) {
        if (typeof title === "undefined")
            return this.$title.html();

        this.$title.html(title);
        return this;
    },

    initialize: function () {
        var that = this;

        var options = util.pick(that.options, ['top', 'isShowClose', 'isShowTitle', 'title', 'content', 'buttons']);
        that.$el.html(that.template(options));

        that.$title = that.$('.js_title');
        that.$content = that.$('.js_content');
    },

    action: function (e) {
        this.options.buttons[$(e.currentTarget).index()].click.call(this, e);
    },

    hide: function () {
        var that = this;

        if (!that._visible) return;
        that._visible = false;

        mask.hide();

        that.$el.css({
            '-webkit-transform': 'scale(1)',
            opacity: 1

        }).animate({
            opacity: 0,
            scale: 0
        }, 300, 'ease-out', function () {
            that.$el.hide();
            that.trigger('Hide');
        });

    },

    show: function () {
        var that = this;
        if (that._visible) return;
        that._visible = true;

        if (!mask) {
            mask = $('<div style="position:absolute;top:0px;bottom:0px;right:0px;width:100%;background: rgba(0,0,0,.5);z-index:2000;display:none"></div>').appendTo(document.body);
        }
        mask.show();

        if (that.el.parentNode == null) that.$el.appendTo(document.body);

        that.$el.css({
            '-webkit-transform': '',
            display: 'block',
            top: this.options.top || '50%'
        });

        that.$el.css({
            marginTop: this.$el.height() / -2,
            '-webkit-transform': 'scale(0)',
            opacity: 0

        }).animate({
            opacity: 1,
            scale: 1
        }, 300, 'ease-out', function () {
            that.trigger('Show');
        });
    },

    content: function (content) {
        if (typeof content === 'undefined')
            return this.$content;

        this.$content.html(content);
    }
});

module.exports = Dialog;
