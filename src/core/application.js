
var $ = require('$'),
    util = require('util'),
    Component = require('./component'),
    Queue = require('./queue');

var URL = require('./url');

var noop = util.noop,
    slice = Array.prototype.slice;

var Navigation = Component.extend({
    events: {
        'click a[href]:not(.js-link-default)': function (e) {
            var that = this,
                target = $(e.currentTarget);

            if (!/^(http\:|https\:|javascript\:|mailto\:|tel\:)/.test(target.attr('href')) && target.attr('target') != '_blank') {
                e.preventDefault();
                var href = target.attr('href');
                if (!/^#/.test(href)) href = '#' + href;

                location.hash = href;
                return false;

            } else {
                target.addClass('js-link-default');
            }
        }
    },
    skip: 0,

    el: '<div class="screen" style="position:fixed;top:0px;bottom:0px;right:0px;width:100%;background:rgba(0,0,0,0);z-index:2000;display:none"></div><div class="viewport"></div>',

    initialize: function (options) {

        this.routeManager = options.routeManager;

        this.activityManager = options.activityManager.setApplication(this);

        this.$mask = $(this.$el[0]).on('click', false);
        this.el = this.$el[1];
        this.queue = Queue.done();
    },

    start: function () {
        var that = this,
            $win = $(window),
            $body = $(document.body),
            $views = $body.find('.view');

        that.$el.appendTo($body);
        that.$el = $(that.el);

        if ($views.length) {
            that.$el.append($views.hide());
        }

        if (!location.hash) location.hash = '/';
        that.hash = URL.trim(location.hash);

        that.queue.push(function (err, res, next) {

            that.activityManager.get(that.hash, function (activity) {

                activity.$el.show().appendTo(that.el);
                that.activityManager.setCurrentActivity(activity);

                activity.doAfterCreate(function () {

                    activity.trigger('Resume').trigger('Show');

                    that.trigger('start');
                    next();
                })
            });

            $win.on('hashchange', function () {
                that.hash = URL.trim(location.hash);

                if (that.skip == 0) {

                    that.to(that.hash);

                } else if (that.skip > 0)
                    that.skip--;
                else
                    that.skip = 0;
            });
        });

        return that;
    },

    navigate: function (url) {
        url = URL.trim(url);
        this.skip++;
        location.hash = url;
    },

    to: function (url) {
        url = URL.trim(url);

        var that = this;
        var queue = this.queue;
        var activityManager = this.activityManager;

        queue.push(function (err, res, next) {
            var currentActivity = activityManager.getCurrentActivity(),
                route = that.routeManager.match(url);

            if (queue.queue.length == 0 && !URL.isEqual(url, location.hash)) {
                that.navigate(url);
            }

            if (currentActivity.path == route.path) {
                activityManager.checkQueryString(currentActivity, route);

                next();
                return;
            }

            activityManager.get(route, function (activity) {
                activityManager.checkQueryString(activity, route);

                if (activity.path != currentActivity.path) {
                    activityManager.setCurrentActivity(activity);

                    if (activity.el.parentNode === null) activity.$el.appendTo(that.el);

                    activity.$el.show().siblings('.view').hide();

                    activity.doAfterCreate(function () {
                        activity.trigger('Resume').trigger('Show');
                    });
                }

                next();
            });
        });
    }
});


module.exports = Navigation;