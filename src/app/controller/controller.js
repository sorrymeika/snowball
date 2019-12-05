import { isFunction, getPropertyDescriptor } from "../../utils";
import { Reaction } from "../../vm";
import { ActivityOptions } from '../types';
import { getApplicationCtx } from "../core/createApplication";
import { registerRoutes } from "../core/registerRoutes";
import Activity from "../core/Activity";
import { ACTIVITY_FACTORY } from "../core/ActivityManager";
import { IS_CONTROLLER, INJECTABLE_PROPS } from "./symbols";

let currentCtx = null;

export function setCurrentCtx(ctx) {
    currentCtx = ctx;
}

export function initWithContext(fn) {
    const ctx = currentCtx;
    if (!ctx) {
        console.error('ctx 不能为空!');
    }
    fn(ctx);
}

/**
 * 控制层修饰符
 * Controller类生命周期
 *     onInit: 页面第一次打开，且动画开始前触发
 *     onShow: 页面显示，动画结束时触发
 *     onCreate: 页面第一次打开，且动画结束后触发
 *     onResume: 页面从后台进入前台，且动画结束时触发
 *     onPause: 页面从前台进入后台，且动画结束时触发
 *     onDestroy: 页面被销毁后触发
 * @param {*} [route] 路由，非必填，尽量将路由收敛到 routes.js中
 * @param {*} componentClass 页面组件
 * @param {*} options
 */
export function controller(route, componentClass, options: ActivityOptions) {
    if (!isFunction(componentClass)) {
        options = componentClass;
        componentClass = route;
        route = undefined;
    }

    return function (Target) {
        Object.defineProperty(Target.prototype, 'ctx', {
            get() {
                return this._ctx;
            }
        });
        Object.defineProperty(Target.prototype, 'app', {
            get() {
                return getApplicationCtx();
            }
        });
        Target.prototype[IS_CONTROLLER] = true;
        Target.prototype['[[ConnectModel]]'] = false;

        Target[ACTIVITY_FACTORY] = createActivityFactory(Target, componentClass, options);

        if (route) {
            registerRoutes({
                [route]: Target
            });
        }
        return Target;
    };
}

function createActivityFactory(Target, componentClass, options) {
    return (location, application) => new Activity(componentClass, location, application, (props, page) => {
        const { ctx } = page;
        const controllerInstance = createController(Target, props, ctx);

        return (setState) => {
            const injectableProps = controllerInstance[INJECTABLE_PROPS];
            const store = {
                '[[Controller]]': controllerInstance
            };

            if (injectableProps) {
                const injectablePropKeys = Object.keys(injectableProps);
                const reaction = new Reaction(() => {
                    reaction.track(() => {
                        const newState = {};
                        injectablePropKeys.forEach((injectorName) => {
                            const old = store[injectorName];
                            let newProp = controllerInstance[injectableProps[injectorName]];
                            if (old !== newProp) {
                                if (isNoBindThisFn(newProp)) {
                                    if (old && old._cb === newProp) {
                                        return;
                                    } else {
                                        newProp = bindThis(newProp, controllerInstance);
                                    }
                                }
                                newState[injectorName] = store[injectorName] = newProp;
                            }
                        });
                        setState(newState);
                    });
                }, true)
                    .track(() => {
                        Object.keys(injectableProps)
                            .forEach((injectorName) => {
                                store[injectorName] = bindThis(controllerInstance[injectableProps[injectorName]], controllerInstance);
                            });
                    });
                page.on('destroy', () => reaction.destroy());

                Object.keys(injectableProps)
                    .forEach((injectorName) => {
                        const propertyName = injectableProps[injectorName];
                        const descriptor = getPropertyDescriptor(controllerInstance, propertyName);
                        const newDescriptor = {
                            enumerable: descriptor.enumerable,
                            configurable: descriptor.configurable,
                        };

                        if (descriptor.get === undefined && descriptor.set === undefined) {
                            newDescriptor.get = function () {
                                return store[injectorName];
                            };
                            if (descriptor.writable) {
                                newDescriptor.set = function (val) {
                                    store[injectorName] = bindThis(val, this);
                                    setState(store);
                                };
                            }
                        } else {
                            newDescriptor.get = descriptor.get;
                            if (descriptor.set) {
                                newDescriptor.set = function (val) {
                                    descriptor.set.call(this, val);
                                    store[injectorName] = bindThis(descriptor.get.call(this), this);
                                    setState(store);
                                };
                            }
                        }
                        Object.defineProperty(controllerInstance, propertyName, newDescriptor);
                    });
            }
            setState(store);
        };
    }, options);
}


let isCreating = false;

function createController(ControllerClass, props, ctx) {
    if (isCreating) {
        throw new Error('不能同时初始化化两个controller');
    }
    isCreating = true;
    currentCtx = ctx;

    ControllerClass.prototype._ctx = ctx;

    const controllerInstance = new ControllerClass(props, ctx);
    controllerInstance._ctx = ctx;

    ControllerClass.prototype._ctx = null;

    const lifecycle = {};

    controllerInstance.onInit && (lifecycle.onInit = controllerInstance.onInit.bind(controllerInstance));
    controllerInstance.onQsChange && (lifecycle.onQsChange = controllerInstance.onQsChange.bind(controllerInstance));
    controllerInstance.onShow && (lifecycle.onShow = controllerInstance.onShow.bind(controllerInstance));
    controllerInstance.onCreate && (lifecycle.onCreate = controllerInstance.onCreate.bind(controllerInstance));
    controllerInstance.onResume && (lifecycle.onResume = controllerInstance.onResume.bind(controllerInstance));
    controllerInstance.onPause && (lifecycle.onPause = controllerInstance.onPause.bind(controllerInstance));
    controllerInstance.onDestroy && (lifecycle.onDestroy = controllerInstance.onDestroy.bind(controllerInstance));
    controllerInstance.shouldRender && (lifecycle.shouldRender = controllerInstance.shouldRender.bind(controllerInstance));

    ctx.page.setLifecycleDelegate(lifecycle);

    isCreating = false;
    currentCtx = null;

    return controllerInstance;
}

function isNoBindThisFn(method) {
    return typeof method === 'function' && method.$$typeof !== 'EventEmitter';
}

function bindThis(method, instance) {
    if (isNoBindThisFn(method)) {
        const fn = (...args) => method.apply(instance, args);
        fn._cb = method;
        return fn;
    }
    return method;
}