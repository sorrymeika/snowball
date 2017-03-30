var Base = require('./base');

var Route = require('./route');
var ActivityManager = require('./activityManager');
var Application = require('./application');

var ApplicationManager = {};

ApplicationManager.create = function (options) {

    var routeManager = new Route(options.routes);

    var activityManager = new ActivityManager({
        routeManager: routeManager
    });

    var application = new Application({
        activityManager: activityManager,
        routeManager: routeManager,
        loginPath: options.loginPath
    });

    return application;
};


module.exports = ApplicationManager;