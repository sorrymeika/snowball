import { isFunction } from "../../utils";
import { registerRoutes } from "../core/registerRoutes";
import Activity from "../core/Activity";
import { ACTIVITY_CREATOR } from "../core/ActivityManager";
import { IS_CONTROLLER, INJECTABLE_PROPS } from "./symbols";
import { internal_subscribeAllMessagesOnInit } from "./onMessage";
import { getDisposableProps } from "./disposable";
import { Reaction } from "../../vm";

let isCreating = false;
export function internal_isControllerCreating() {
    return isCreating;
}

let controllerCreationHandlers;
export function internal_onControllerCreated(fn) {
    if (!isCreating) {
        throw new Error('只能在controller创建时调用!');
    }
    controllerCreationHandlers.push(fn);
}

function bindMethod(method, instance) {
    if (typeof method === 'function' && method.prototype) {
        const fn = () => method.apply(instance, arguments);
        fn._cb = method;
        return fn;
    }
    return method;
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
export function controller(route, componentClass, options) {
    if (!isFunction(componentClass)) {
        options = componentClass;
        componentClass = route;
        route = undefined;
    }

    return function (Target) {
        Object.defineProperty(Target.prototype, 'context', {
            get() {
                return this.__context;
            }
        });
        Target.prototype[IS_CONTROLLER] = true;
        Target.prototype['[[ConnectModel]]'] = false;

        const createActivity = (location, application) => new Activity(componentClass, location, application, (props, page) => {
            if (isCreating) {
                throw new Error('不能同时初始化化两个controller');
            }
            isCreating = true;
            controllerCreationHandlers = [];

            const target = new Target(props, page);
            const lifecycle = {};

            target.__context = page;
            target.onInit && (lifecycle.onInit = target.onInit.bind(target));
            target.onQsChange && (lifecycle.onQsChange = target.onQsChange.bind(target));
            target.onShow && (lifecycle.onShow = target.onShow.bind(target));
            target.onCreate && (lifecycle.onCreate = target.onCreate.bind(target));
            target.onResume && (lifecycle.onResume = target.onResume.bind(target));
            target.onPause && (lifecycle.onPause = target.onPause.bind(target));
            target.onDestroy && (lifecycle.onDestroy = target.onDestroy.bind(target));
            target.shouldRender && (lifecycle.shouldRender = target.shouldRender.bind(target));

            page.setLifecycleDelegate(lifecycle);

            controllerCreationHandlers.forEach((fn) => fn(target, page));
            controllerCreationHandlers = null;
            isCreating = false;

            internal_subscribeAllMessagesOnInit(target);

            page.on('destroy', () => {
                getDisposableProps(target).forEach((name) => {
                    target[name] && target[name].destroy();
                });
            });

            return (setState) => {
                const injectableProps = target[INJECTABLE_PROPS];
                const store = {
                    $SnowballController: target
                };

                if (injectableProps) {
                    const reaction = new Reaction(() => {
                        reaction.track(() => {
                            const newState = {};
                            Object.keys(injectableProps)
                                .forEach((injectorName) => {
                                    const old = store[injectorName];
                                    let newProp = target[injectableProps[injectorName]];
                                    if (old !== newProp) {
                                        if (typeof newProp === 'function' && newProp.prototype) {
                                            if (old && old._cb === newProp) {
                                                return;
                                            } else {
                                                newProp = bindMethod(newProp, target);
                                            }
                                        }
                                        newState[injectorName] = store[injectorName] = newProp;
                                    }
                                });
                            setState(newState);
                        });
                    })
                        .track(() => {
                            Object.keys(injectableProps)
                                .forEach((injectorName) => {
                                    store[injectorName] = bindMethod(target[injectableProps[injectorName]], target);
                                });
                        });
                    page.on('destroy', () => reaction.destroy());

                    Object.keys(injectableProps)
                        .forEach((injectorName) => {
                            const propertyName = injectableProps[injectorName];
                            let proto = target;
                            let descriptor;

                            while (1) {
                                descriptor = Object.getOwnPropertyDescriptor(proto, propertyName);
                                if (descriptor) {
                                    break;
                                }

                                const parent = Object.getPrototypeOf(proto);
                                if (parent === proto || parent === Object.prototype) {
                                    break;
                                } else {
                                    proto = parent;
                                }
                            }
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
                                        store[injectorName] = bindMethod(val, this);
                                        setState(store);
                                    };
                                }
                            } else {
                                newDescriptor.get = descriptor.get;
                                if (descriptor.set) {
                                    newDescriptor.set = function (val) {
                                        descriptor.set.call(this, val);
                                        store[injectorName] = bindMethod(descriptor.get.call(this), this);
                                        setState(store);
                                    };
                                }
                            }
                            Object.defineProperty(target, propertyName, newDescriptor);
                        });
                }
                setState(store);
            };
        }, options);

        Target[ACTIVITY_CREATOR] = createActivity;

        if (route) {
            registerRoutes({
                [route]: Target
            });
        }
        return Target;
    };
}