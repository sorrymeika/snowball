import { isFunction, isString } from "../../utils";
import { Model } from "../../vm";
import { ActivityOptions } from '../types';
import { getApplicationCtx } from "../core/createApplication";
import { registerRoutes } from "../core/registerRoutes";
import { getWiringInfo } from "../core/autowired";

export const INJECTABLE_PROPS = Symbol('INJECTABLE_PROPS');

let currentCtx = null;
let isCreating = false;

export function setCurrentCtx(ctx) {
    currentCtx = ctx;
}

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

        function controllerFactory(props, ctx) {
            if (isCreating) {
                throw new Error('不能同时初始化化两个controller');
            }
            isCreating = true;
            currentCtx = ctx;

            Controller.prototype._ctx = ctx;

            const controllerInstance = new Controller(props, ctx);
            controllerInstance._ctx = ctx;
            Controller.prototype._ctx = null;

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