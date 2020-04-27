import { isFunction, isString } from "../../utils";
import { ActivityOptions } from '../types';
import { appCtx } from "../core/createApplication";
import { registerRoutes } from "../core/registerRoutes";
import { getWiringInfo } from "../core/autowired";

export const symbolCtx = Symbol('SymbolCtx');

let isCreating = false;
let currentCtx;

export function initWithContext(fn) {
    const ctx = currentCtx || getWiringInfo().ctx;
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
    } else if (isFunction(cfg) || !cfg.component) {
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
        Object.defineProperties(Controller.prototype, {
            ctx: {
                get() {
                    return this[symbolCtx];
                }
            },
            app: {
                get() {
                    return appCtx;
                }
            }
        });

        function controllerFactory(props, ctx) {
            if (isCreating) {
                throw new Error('不能同时初始化化两个controller');
            }
            isCreating = true;
            currentCtx = ctx;

            Controller.prototype[symbolCtx] = ctx;
            const controllerInstance = new Controller(props, ctx);
            controllerInstance[symbolCtx] = ctx;
            Controller.prototype[symbolCtx] = null;

            isCreating = false;
            currentCtx = null;

            return controllerInstance;
        }
        controllerFactory.$$typeof = 'snowball/app#controller';
        controllerFactory.componentClass = componentClass;
        controllerFactory.config = config || [];
        controllerFactory.options = options;

        if (route) {
            registerRoutes({
                [route]: controllerFactory
            });
        }

        return controllerFactory;
    };
}