import ActivityManager from './ActivityManager';
import Router from './Router';
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
 * @param {Array} props 应用参数
 * @param {Object} props.projects 子项目映射
 * @param {Object} props.routes 路由映射
 * @param {Object} props.ctx 上下文配置
 * @param {Element} rootElement 页面根元素
 */
export function createApplication({
    projects,
    routes,
    extend,
    options,
    autoStart = true
}, rootElement, callback?) {
    if (application) throw new Error('application has already created!');

    application = new Application(
        (application) => new Navigation(application, options),
        (application) => new ActivityManager(application, options),
        new Router(projects, routes),
        rootElement,
        options
    );

    const app = {
        navigate: application.navigation.transitionTo,
        registerRoutes: application.registerRoutes.bind(application)
    };
    const base = {
        navigation: application.navigation
    };
    const ctx = extend ? { ...extend(app), ...base } : base;
    application.ctx = ctx;

    if (autoStart) {
        beforeAppStart();
        application.start(callback);
    } else {
        app.start = (cb) => {
            beforeAppStart();
            application.start(cb);
        };
    }

    return ctx;
}