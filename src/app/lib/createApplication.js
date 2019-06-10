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

/**
 * 应用控制器
 * @param {Element} rootElement 页面根元素
 */
/**
 * 创建应用
 * @param {Array} projects
 * @param {Array} routes
 * @param {Element} rootElement
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
    actionsBeforeAppStart.forEach((action) => {
        action(application);
    });
    actionsBeforeAppStart = null;

    if (autoStart) {
        application.start(callback);
    }

    return application;
}