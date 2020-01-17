import { isFunction, isString, getOwnPropertyDescriptors, getPropertyDescriptors } from "../../utils";
import { Reaction, Model } from "../../vm";
import { ActivityOptions } from '../types';
import { getApplicationCtx } from "../core/createApplication";
import { registerRoutes } from "../core/registerRoutes";
import Activity from "../core/Activity";
import { ACTIVITY_FACTORY } from "../core/ActivityManager";
import { getAutowiredCtx, isAutowired } from "./autowired";
import { buildConfiguration } from "./configuration";

export const INJECTABLE_PROPS = Symbol('INJECTABLE_PROPS');

let currentCtx = null;

export function setCurrentCtx(ctx) {
    currentCtx = ctx;
}

export function initWithContext(fn) {
    const ctx = currentCtx || getAutowiredCtx();
    if (!ctx) {
        console.error('ctx 不能为空!');
    }
    fn(ctx);
}

type ControllerCfg = {
    route: string,
    component: any,
    options: ActivityOptions,
    configuration: any[] | any
}

/**
 * 控制层修饰符
 * @param {ControllerCfg} cfg 参数
 * @param {*} cfg.component 页面组件
 * @param {*} [cfg.route] 路由，非必填，尽量将路由收敛到 routes.js中
 * @param {*} [cfg.configuration] 配置项
 * @param {ActivityOptions} [cfg.options]
 * @description
 * Controller类生命周期
 *     onInit: 页面第一次打开，且动画开始前触发
 *     onShow: 页面显示，动画结束时触发
 *     onCreate: 页面第一次打开，且动画结束后触发
 *     onResume: 页面从后台进入前台，且动画结束时触发
 *     onPause: 页面从前台进入后台，且动画结束时触发
 *     onDestroy: 页面被销毁后触发
 */
export function controller(cfg: ControllerCfg) {
    let options,
        componentClass,
        route,
        config;

    if (isString(cfg)) {
        route = cfg;
        componentClass = arguments[1];
        options = arguments[2];
    } else if (isFunction(cfg)) {
        componentClass = cfg;
        options = arguments[1];
        route = undefined;
    } else {
        route = cfg.route;
        componentClass = cfg.component;
        config = cfg.configuration;
        options = cfg.options;
    }

    return function (Controller) {
        Controller[INJECTABLE_PROPS] = filterInjectableProps(getPropertyDescriptors(Controller.prototype));

        Object.defineProperty(Controller.prototype, 'ctx', {
            get() {
                return this._ctx;
            }
        });
        Object.defineProperty(Controller.prototype, 'app', {
            get() {
                return getApplicationCtx();
            }
        });
        Model.neverConnectToModel(Controller.prototype);

        Controller[ACTIVITY_FACTORY] = createActivityFactory(Controller, componentClass, config, options);

        if (route) {
            registerRoutes({
                [route]: Controller
            });
        }
        return Controller;
    };
}

function createActivityFactory(Controller, componentClass, config, options) {
    const configs = config ? [].concat(config) : [];

    let Configuration;

    return (location, application) => new Activity(componentClass, location, application, (props, page) => {
        const { ctx } = page;
        if (!Configuration) {
            Configuration = buildConfiguration(ctx.app._configuration.concat(configs));
        }
        ctx.Configuration = Configuration;
        const controllerInstance = createController(Controller, props, ctx);

        return (setState) => {
            const protoProps = Controller[INJECTABLE_PROPS];
            const injectableProps = Object.assign({}, protoProps, getOwnPropertyDescriptors(controllerInstance));
            const reactivePropNames = [];
            const store = {
                '[[Controller]]': controllerInstance
            };

            for (let propName in injectableProps) {
                if (isInjectableProp(propName)) {
                    if (isAutowired(controllerInstance, propName)) {
                        store[propName] = controllerInstance[propName];
                    } else {
                        reactivePropNames.push(propName);
                    }
                }
            }

            if (reactivePropNames.length) {
                const bind = (fn, ctx) => {
                    const boundFn = fn.bind(ctx);
                    boundFn._cb = fn;
                    return boundFn;
                };
                const reaction = new Reaction(() => {
                    reaction.track(() => {
                        const newState = {};
                        reactivePropNames.forEach((propName) => {
                            const old = store[propName];
                            let newProp = controllerInstance[propName];
                            if (old !== newProp) {
                                if (typeof newProp === 'function') {
                                    if (old && old._cb === newProp) {
                                        return;
                                    } else {
                                        newProp = bind(newProp, controllerInstance);
                                    }
                                }
                                newState[propName] = store[propName] = newProp;
                            }
                        });
                        setState(newState);
                    });
                }, true)
                    .track(() => {
                        reactivePropNames.forEach((propName) => {
                            const prop = controllerInstance[propName];
                            store[propName] = typeof prop === 'function' && protoProps[propName]
                                ? bind(prop, controllerInstance)
                                : prop;
                        });
                    });
                page.on('destroy', () => reaction.destroy());

                reactivePropNames
                    .forEach((propName) => {
                        const descriptor = injectableProps[propName];
                        const newDescriptor = {
                            enumerable: descriptor.enumerable,
                            configurable: descriptor.configurable,
                        };

                        if (descriptor.get === undefined && descriptor.set === undefined) {
                            newDescriptor.get = function () {
                                return store[propName];
                            };
                            if (descriptor.writable) {
                                newDescriptor.set = function (val) {
                                    store[propName] = val;
                                    setState(store);
                                };
                            }
                        } else {
                            newDescriptor.get = descriptor.get;
                            if (descriptor.set) {
                                newDescriptor.set = function (val) {
                                    descriptor.set.call(this, val);
                                    store[propName] = descriptor.get.call(this);
                                    setState(store);
                                };
                            }
                        }
                        Object.defineProperty(controllerInstance, propName, newDescriptor);
                    });
            }
            setState(store);
        };
    }, options);
}


let isCreating = false;
const lifecycleNames = ['onInit', 'onQsChange', 'onShow', 'onCreate', 'onResume', 'onPause', 'onDestroy', 'shouldRender'];

function createController(Controller, props, ctx) {
    if (isCreating) {
        throw new Error('不能同时初始化化两个controller');
    }
    isCreating = true;
    currentCtx = ctx;

    Controller.prototype._ctx = ctx;

    const controllerInstance = new Controller(props, ctx);
    controllerInstance._ctx = ctx;
    Controller.prototype._ctx = null;

    const lifecycle = {};

    lifecycleNames.forEach((lifecycleName) => {
        controllerInstance[lifecycleName] && (lifecycle[lifecycleName] = controllerInstance[lifecycleName].bind(controllerInstance));
    });

    ctx.page.setLifecycleDelegate(lifecycle);

    isCreating = false;
    currentCtx = null;

    return controllerInstance;
}


const excludeProps = [...lifecycleNames, 'constructor', 'ctx', 'app'];

function filterInjectableProps(descriptors) {
    const injectableProps = {};
    for (let propName in descriptors) {
        if (isInjectableProp(propName)) {
            injectableProps[propName] = descriptors[propName];
        }
    }
    return injectableProps;
}

function isInjectableProp(propName) {
    return typeof propName === 'string' && !excludeProps.includes(propName) && /^[a-z]/.test(propName);
}