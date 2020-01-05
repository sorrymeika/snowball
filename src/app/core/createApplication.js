import { isFunction, getOwnPropertyDescriptors } from '../../utils';
import ActivityManager from './ActivityManager';
import Router from './Router';
import Navigation from './Navigation';
import Application from './Application';
import { EventEmitter, createEmitter, createAsyncEmitter } from '../../core/event';
import { withAutowired } from '../controller/autowired';
import { buildConfiguration } from '../controller/configuration';

// 当前启动的应用的实例
let application;
let actionsBeforeAppStart = [];

export function _getApplication() {
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

const currentCtxProperty = {
    get() {
        return application.currentActivity.page.ctx;
    }
};

export const ctx = new EventEmitter();

Object.defineProperties(ctx, {
    currentCtx: currentCtxProperty,
    current: currentCtxProperty,
    createEmitter: {
        value: createEmitter,
        writable: false
    },
    createAsyncEmitter: {
        value: createAsyncEmitter,
        writable: false
    },
    emit: {
        value: ctx.trigger.bind(ctx),
        writable: false
    },
});

function extendCtx(extendFn) {
    const descriptors = getOwnPropertyDescriptors(extendFn(ctx));
    Object.keys(descriptors)
        .forEach((key) => {
            const descriptor = descriptors[key];
            if (isFunction(descriptor.get)) {
                descriptor.get = descriptor.get.bind(ctx);
            }
            Object.defineProperty(ctx, key, descriptor);
        });
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
    projects = {},
    routes,
    extend,
    configuration,
    options,
    autoStart = true
}, rootElement, callback?) {
    if (application) throw new Error('application has already created!');

    options = {
        maxActivePages: 10,
        disableTransition: false,
        ...options
    };

    const conf = configuration ? [].concat(configuration) : [];
    ctx._configuration = conf;
    ctx.Configuration = buildConfiguration(conf);

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
        withAutowired(application, () => {
            extendCtx(extend);
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