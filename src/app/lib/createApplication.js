import ActivityManager from './ActivityManager';
import RouteManager from './RouteManager';
import Navigation from './Navigation';
import Application from './Application';

// 当前启动的应用的实例
let application;
let actionsBeforeAppStart = [];

export function internal_getApplication() {
    return application;
}

export function internal_beforeStartApplication(fn) {
    actionsBeforeAppStart.push(fn);
}

function beforeAppStart() {
    actionsBeforeAppStart.forEach((action) => {
        action(application);
    });
    actionsBeforeAppStart = null;
}

/**
 * 创建应用
 * @param {Array} projects
 * @param {Array} routes
 * @param {Element} rootElement 页面根元素
 */
export function createApplication({
    projects,
    routes,
    stores,
    options,
    autoStart = true
}, rootElement, callback?) {
    if (application) throw new Error('application has already created!');

    application = new Application(
        (application) => new Navigation(application),
        (application) => new ActivityManager(application, options),
        new RouteManager(projects, routes),
        rootElement,
        options
    );

    const app = {
        navigate: application.navigation.transitionTo,
        registerRoutes: application.registerRoutes.bind(application)
    };

    if (autoStart) {
        beforeAppStart();
        application.start(callback);
    } else {
        app.start = (cb) => {
            beforeAppStart();
            application.start(cb);
        };
    }

    return app;
}