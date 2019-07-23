import ActivityManager from './ActivityManager';
import Router from './Router';
import Navigation from './Navigation';
import Application from './Application';

// 当前启动的应用的实例
let application;
let applicationCtx;
let actionsBeforeAppStart = [];

export function internal_getApplication() {
    return application;
}

export function getApplicationCtx() {
    return applicationCtx;
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
 * @param {Object} props.extend 扩展应用上下文
 * @param {Object} [props.options] 应用属性
 * @param {boolean} [props.options.disableTransition] 禁用跳转切换动画
 * @param {Element} rootElement 页面根元素
 * @param {Element} [callback] 回调函数
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

    const { navigation } = application;
    const app = {
        navigation: ['forward', 'back', 'replace', 'transitionTo', 'home'].reduce((nav, prop) => {
            const method = navigation[prop];
            nav[prop] = (...args) => {
                method.apply(navigation, args);
            };
            return nav;
        }, {}),
        registerRoutes: application.registerRoutes.bind(application)
    };
    const ctx = extend ? { ...extend(app), ...app } : app;
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