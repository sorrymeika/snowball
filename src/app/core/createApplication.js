import { isFunction } from '../../utils';
import ActivityManager from './ActivityManager';
import Router from './Router';
import Navigation from './Navigation';
import Application from './Application';
import { EventEmitter } from '../../core/event';

// 当前启动的应用的实例
let application;
let actionsBeforeAppStart = [];

export function internal_getApplication() {
    return application;
}

export function getApplicationCtx() {
    return ctx;
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

export const ctx = {
    get current() {
        return application.currentActivity.page.ctx;
    },
    event: new EventEmitter()
};

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
    projects = {},
    routes,
    extend,
    options,
    autoStart = true
}, rootElement, callback?) {
    if (application) throw new Error('application has already created!');

    options = {
        maxActivePages: 10,
        disableTransition: false,
        ...options
    };

    application = new Application(
        new Router(projects, routes),
        rootElement,
        options
    );

    const navigation = new Navigation(application, options);
    application.setNavigation(navigation)
        .setActivityManager(new ActivityManager(application, options));

    Object.assign(ctx, {
        navigation: ['forward', 'back', 'replace', 'transitionTo', 'home'].reduce((nav, prop) => {
            const method = navigation[prop];
            nav[prop] = (...args) => {
                method.apply(navigation, args);
            };
            return nav;
        }, {}),
        registerRoutes: application.registerRoutes.bind(application),
    });

    if (extend) {
        const descriptors = Object.getOwnPropertyDescriptors(extend(ctx));
        Object.keys(descriptors)
            .forEach((key) => {
                const descriptor = descriptors[key];

                if (key === 'services' || key === 'service') {
                    const services = descriptor.value;
                    const cache = {};
                    const serviceClasses = {};

                    Object.defineProperty(ctx, 'service', {
                        writable: false,
                        value: Object.defineProperties({}, Object.keys(services).reduce((classes, key) => {
                            const serviceClass = services[key];
                            Object.defineProperty(serviceClass.prototype, 'app', {
                                get() {
                                    return ctx;
                                }
                            });
                            serviceClasses[key] = serviceClass;
                            classes[key] = {
                                get() {
                                    let service = cache[key];
                                    if (!service) {
                                        const ServiceClass = serviceClasses[key];
                                        serviceClasses[key] = null;
                                        return (cache[key] = new ServiceClass(ctx));
                                    }
                                    return service;
                                }
                            };
                            return classes;
                        }, {}))
                    });
                } else {
                    if (isFunction(descriptor.get)) {
                        descriptor.get = descriptor.get.bind(ctx);
                    }
                    Object.defineProperty(ctx, key, descriptor);
                }
            });
    }

    application.ctx = ctx;

    if (autoStart) {
        beforeAppStart();
        application.start(callback);
    } else {
        ctx.start = (cb) => {
            beforeAppStart();
            application.start(cb);
        };
    }

    return ctx;
}