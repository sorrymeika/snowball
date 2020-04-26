import { isFunction, getOwnPropertyDescriptors } from '../../utils';
import ActivityManager from './ActivityManager';
import Router from './Router';
import Navigation from './Navigation';
import Application from './Application';
import { EventEmitter, Emitter } from '../../core/event';
import { withAutowiredScope, autowired } from './autowired';
import { buildConfiguration } from './configuration';

// 当前启动的应用的实例
let application;

export function _getApplication() {
    return application;
}

const currentCtxProperty = {
    get() {
        return application.currentActivity.page.ctx;
    }
};

export const appCtx = Object.defineProperties(new EventEmitter(), {
    currentCtx: currentCtxProperty,
    current: currentCtxProperty,
});
appCtx.createEmitter = Emitter.create;
appCtx.createAsyncEmitter = Emitter.async;

/**
 * 创建应用
 * @param {Array} props 应用参数
 * @param {Object} props.projects 子项目映射
 * @param {Object} props.routes 路由映射
 * @param {Object} props.extend 扩展应用上下文
 * @param {Object} [props.options] 应用属性
 * @param {boolean} [props.options.maxMemorizedPages] 内存中最大页面数
 * @param {boolean} [props.options.activedPageStyle] 激活的页面的样式
 * @param {boolean} [props.options.disableTransition] 禁用跳转切换动画
 * @param {boolean} [props.options.autoStart=true] 是否自动启动，为否时需要主动调用start方法
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
        maxMemorizedPages: 10,
        disableTransition: false,
        autoStart: true,
        activedPageStyle: {
            display: 'block',
            opacity: 1,
            '-webkit-transform': 'translate3d(0%,0%,0)'
        },
        ...options
    };

    const conf = configuration ? [].concat(configuration) : [];
    appCtx._configuration = conf;

    application = new Application(
        new Router(projects, routes),
        rootElement,
        appCtx,
        options
    );
    const navigation = new Navigation(application, options);
    application.setNavigation(navigation)
        .setActivityManager(new ActivityManager(application));

    const Configuration = buildConfiguration(conf);
    let autowiredCache;
    let autowiredCount = 0;
    let isStart = false;
    Object.assign(appCtx, {
        navigation: ['forward', 'back', 'replace', 'transitionTo', 'home'].reduce((nav, prop) => {
            const method = navigation[prop];
            nav[prop] = (...args) => {
                method.apply(navigation, args);
            };
            return nav;
        }, {
            get history() {
                return [...navigation.history];
            }
        }),
        registerRoutes: application.registerRoutes.bind(application),
        start(cb) {
            if (isStart) throw new Error('the application has already been started!');
            isStart = true;

            this.trigger('beforestart');
            application.start(cb);
        },
        autowired(...args) {
            let instance = withAutowiredScope(autowiredCache || (autowiredCache = {
                ctx: {
                    Configuration
                },
                app: appCtx
            }), () => autowired(...args));
            autowiredCount++;
            Promise.resolve().then(() => {
                autowiredCount--;
                if (autowiredCount == 0) {
                    autowiredCache = null;
                }
            });
            return instance;
        }
    });

    if (extend) {
        extendCtx(extend);
    }

    if (options.autoStart) {
        appCtx.start(callback);
    }

    return appCtx;
}

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