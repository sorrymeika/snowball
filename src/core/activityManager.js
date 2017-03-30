
var $ = require('$');
var util = require('util');
var Event = require('./event');
var getUrlPath = require('./url').getPath;


function setActivityReferrer(activedInstance, route) {
    activedInstance.isForward = route.isForward;

    if (route.isForward) {
        var currActivity,
            prevRoute = route,
            prevActivity = activedInstance;

        while ((currActivity = prevRoute.prevActivity) && (prevActivity = currActivity.route.prevActivity) && prevRoute) {
            if (prevActivity == activedInstance) {
                currActivity.route.prevActivity = activedInstance.route.prevActivity;
                currActivity.referrer = currActivity.route.referrer = activedInstance.referrer;
                currActivity.referrerDir = currActivity.route.referrerDir = activedInstance.referrerDir;
                currActivity.swipeBack = activedInstance.swipeBack;
                break;
            }
            prevRoute = prevActivity.route;
        }

        activedInstance.referrer = route.referrer;
        activedInstance.referrerDir = route.referrerDir;
    }

    if (activedInstance.recordBackURL) {
        var backURL = route.query.from || activedInstance.referrer || activedInstance.defaultBackURL;
        backURL && getUrlPath(backURL) != route.path.toLowerCase() && (activedInstance.swipeBack = backURL);
    }
}

function setActivityRoute(activity, route) {
    activity._query = $.extend({}, activity.query);

    activity.route = route;
    activity.hash = route.hash;
    activity.url = route.url;
    activity.path = route.path;
    activity.query = route.query;
}

/**
 * Activity 管理器
 */
function ActivityManager(options) {

    this.routeManager = options.routeManager;
}

ActivityManager.prototype = {

    _activities: {},

    _currentActivity: null,

    setCurrentActivity: function (currentActivity) {
        this._currentActivity = currentActivity;
        return this;
    },

    getCurrentActivity: function () {
        return this._currentActivity;
    },

    setApplication: function (application) {
        this.application = application;
        return this;
    },

    checkQueryString: function (activity, route) {
        if (route.data) {
            Object.assign(activity.route.data, route.data);
        }

        if (activity.route.url != route.url) {
            route.data = activity.route.data;

            setActivityRoute(activity, route);

            var diff = {};
            var before;

            for (var key in activity.query) {
                if (!(key in activity._query)) {
                    activity._query[key] = undefined;
                }
            }
            for (var key in activity._query) {
                before = activity._query[key];

                if (before != activity.query[key]) {
                    diff[key] = before;
                }
            }

            activity.trigger(new Event('QueryChange', {
                data: diff
            }));
        }
    },

    get: function (url, callback) {
        var that = this;
        var route = typeof url === 'string' ? this.routeManager.match(url) : url;

        if (!route) {
            return;
        }

        var path = getUrlPath(route.path);
        var activity = this._activities[path];

        if (activity == null) {
            (function (fn) {
                route.package ? seajs.use(route.package + ".js?v" + sl.buildVersion, fn) : fn();

            })(function () {

                seajs.use(route.view, function (Activity) {

                    if (null != Activity) {
                        var application = that.application;
                        var options = {
                            application: application,
                            fuckMe: function (activity) {
                                setActivityReferrer(activity, route);
                                setActivityRoute(activity, route);
                            }
                        }
                        var $el = application.$el.find('[data-path="' + route.path + '"]');

                        if ($el.length) {
                            options.el = $el;
                        }

                        activity = new Activity(options);

                        activity.on('Destroy', function () {

                            that.remove(this.path);
                        })

                        that.set(path, activity);

                        activity.doAfterCreate(function () {
                            callback.call(that, activity, route);
                        })

                    } else {
                        location.hash = that._currentActivity.url;
                    }
                });
            });

        } else {
            setActivityReferrer(activity, route);

            callback.call(that, activity, route);
        }
    },

    set: function (url, activity) {
        this._activities[getUrlPath(url)] = activity;
    },

    remove: function (url) {
        this._activities[getUrlPath(url)] = null;
    }
}

module.exports = ActivityManager;
