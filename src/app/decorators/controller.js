import { registerRoutes } from "../lib/registerRoutes";
import Activity from "../lib/Activity";
import { CONTROLLER, IS_CONTROLLER, INJECTABLE_PROPS } from "./symbols";
import { internal_subscribeAllMessagesOnInit } from "./onMessage";
import { getDisposableProps } from "./disposable";

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
    return typeof method === 'function' && method.prototype
        ? () => method.apply(instance, arguments)
        : method;
}

/**
 * 控制层修饰符
 * Controller类生命周期
 *     pgOnInit: 页面第一次打开，且动画开始前触发
 *     pgOnShow: 页面显示，动画结束时触发
 *     pgOnCreate: 页面第一次打开，且动画结束后触发
 *     pgOnResume: 页面从后台进入前台，且动画结束时触发
 *     pgOnPause: 页面从前台进入后台，且动画结束时触发
 *     pgOnDestroy: 页面被销毁后触发
 * @param {*} [route] 路由，非必填，尽量将路由收敛到 routes.js中
 * @param {*} componentClass 页面组件
 */
export default function controller(route, componentClass, options) {
    if (!componentClass) {
        componentClass = route;
        route = undefined;
    }

    return function (Target) {
        if (Target.prototype.getContext && !Target.prototype[IS_CONTROLLER]) {
            throw new Error('不可重写controller的getContext方法');
        }
        Target.prototype.getContext = function () {
            return this.__context;
        };
        Target.prototype[IS_CONTROLLER] = true;

        const createActivity = (location, application) => new Activity(componentClass, location, application, (props, page) => {
            if (isCreating) {
                throw new Error('不能同时初始化化两个controller');
            }
            isCreating = true;
            controllerCreationHandlers = [];

            const target = new Target(props, page);
            const lifecycle = {};

            target.__context = page;
            target.pgOnInit && (lifecycle.onInit = target.pgOnInit.bind(target));
            target.pgOnQsChange && (lifecycle.onQsChange = target.pgOnQsChange.bind(target));
            target.pgOnShow && (lifecycle.onShow = target.pgOnShow.bind(target));
            target.pgOnCreate && (lifecycle.onCreate = target.pgOnCreate.bind(target));
            target.pgOnResume && (lifecycle.onResume = target.pgOnResume.bind(target));
            target.pgOnPause && (lifecycle.onPause = target.pgOnPause.bind(target));
            target.pgOnDestroy && (lifecycle.onDestroy = target.pgOnDestroy.bind(target));
            target.pgShouldRender && (lifecycle.shouldRender = target.pgShouldRender.bind(target));

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
                const store = {};

                injectableProps && Object.keys(injectableProps)
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
                            store[injectorName] = bindMethod(target[propertyName], target);

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

                setState(store);
            };
        });
        createActivity.__is_activity_factory__ = true;

        Target[CONTROLLER] = createActivity;

        if (route) {
            registerRoutes({
                [route]: Target
            });
        }
        return Target;
    };
}