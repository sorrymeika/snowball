import { isFunction, getOwnPropertyDescriptors } from '../../utils';
import ActivityManager from './ActivityManager';
import Router from './Router';
import Navigation from './Navigation';
import Application from './Application';
import { EventEmitter, createEmitter, createAsyncEmitter } from '../../core/event';
import { withAutowired } from './autowired';
import { buildConfiguration } from './configuration';

// 当前启动的应用的实例
let application;

export function _getApplication() {
    return application;
}

export function getApplicationCtx() {
    return appCtx;
}

const currentCtxProperty = {
    get() {
        return application.currentActivity.page.ctx;
    }
};

export const appCtx = new EventEmitter();

Object.defineProperties(appCtx, {
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
        value: appCtx.trigger.bind(appCtx),
        writable: false
    },
});

function extendCtx(extendFn) {
    const descriptors = getOwnPropertyDescriptors(extendFn(appCtx));
    Object.keys(descriptors)
        .forEach((key) => {
            const descriptor = descriptors[key];
            if (isFunction(descriptor.get)) {
                descriptor.get = descriptor.get.bind(appCtx);
            }
            Object.defineProperty(appCtx, key, descriptor);
        });
}

/**
 * 创建应用
 * @param {Array} props 应用参数
 * @param {Object} props.projects 子项目映射
 * @param {Object} props.routes 路由映射
 * @param {Object} props.extend 扩展应用上下文
 * @param {Object} [props.options] 应用属性
 * @param {boolean} [props.options.maxActivePages] 最大活动页面数
 * @param {boolean} [props.options.disableTransition] 禁用跳转切换动画
 * @param {boolean} [props.options.autoStart] 是否自动启动，为否时需要主动调用start方法
 * @param {Element} rootElement 页面根元素
 * @param {Element} [callback] 回调函数
 */
export function createApplication({
    projects = {},
    routes,
    extend,
    configuration,
    options,
}, rootElement, callback?) {
    if (application) throw new Error('application has already been created!');

    options = {
        maxActivePages: 10,
        disableTransition: false,
        autoStart: true,
        ...options
    };

    const conf = configuration ? [].concat(configuration) : [];
    appCtx._configuration = conf;

    application = new Application(
        new Router(projects, routes),
        rootElement,
        options
    );

    const navigation = new Navigation(application, options);
    application.setNavigation(navigation)
        .setActivityManager(new ActivityManager(application, options));

    let isStart = false;
    Object.assign(appCtx, {
        navigation: ['forward', 'back', 'replace', 'transitionTo', 'home'].reduce((nav, prop) => {
            const method = navigation[prop];
            nav[prop] = (...args) => {
                method.apply(navigation, args);
            };
            return nav;
        }, {}),
        registerRoutes: application.registerRoutes.bind(application),
        start(cb) {
            if (isStart) throw new Error('the application has already been started!');
            isStart = true;

            this.trigger('beforestart');
            application.start(cb);
        }
    });
    application.ctx = appCtx;

    application.__autowired__ = {
        ctx: {
            Configuration: buildConfiguration(conf)
        },
        app: appCtx
    };

    if (extend) {
        withAutowired(application.__autowired__, () => {
            extendCtx(extend);
        });
    }

    if (options.autoStart) {
        appCtx.start(callback);
    }

    return appCtx;
}