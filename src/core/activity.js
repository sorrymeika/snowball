var $ = require('$');
var util = require('util');
var Component = require('./component');

var noop = util.noop;

var Page = Component.extend({
    el: '<div class="view"></div>',

    initialize: function (options) {
        var that = this;

        options.fuckMe(this);

        that.application = options.application;

        that.on('Resume', that.onResume)
            .on('Show', that.onShow)
            .on('Show', that._statusChange)
            .on('Pause', that.onPause)
            .on('Pause', that._statusChange)
            .on('QueryChange', that.onQueryChange);

        if (!that.$el.data('path')) {
            that.$el.data('url', that.url).data('path', that.path);

            var promise = new Promise(function (resolve) {
                seajs.use(that.route.template, function (razor) {
                    that.razor = razor;

                    that.$el.html(that.razor.html(that.data)).appendTo(that.application.$el);
                    that.trigger("Create");
                    that.onCreate();

                    resolve();
                });
            })

            this.afterCreate = function (fn) {
                promise.then(fn)
            }

        } else {
            this.onCreate();
            this.afterCreate = function (fn) {
                fn();
            }
        }
    },

    onCreate: noop,
    onStart: noop,
    onResume: noop,

    //进入动画结束时触发
    onShow: noop,

    onStop: noop,

    //离开动画结束时触发
    onPause: noop,

    _statusChange: function (e) {
        if (this._status == 'Pause') {
            this.trigger('Resume');
        }
        this._status = e.type;
    },

    onQueryChange: noop,

    queryString: function (key, val) {
        if (typeof val === 'undefined')
            return this.route.query[key];

        else if (val === null || val === false || val === '')
            delete this.route.query[key];
        else
            this.route.query[key] = val || '';

        var query = $.param(this.route.query);

        this.application.navigate(this.route.path + (query ? '?' + query : ''));
    },

    onResult: function (event, fn) {
        return this.listenTo(this.application, event, fn);
    },

    setResult: function () {
        this.application.trigger.apply(this.application, arguments);
        return this;
    },

    back: function (url) {
        this.application.to(url);
    },
    forward: function (url) {
        this.application.to(url);
    }
});

sl.Page = Page;

module.exports = Page;