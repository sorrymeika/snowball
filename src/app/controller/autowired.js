
import { isString } from "../../utils";

const AUTOWIRED_PROPS = Symbol('AUTOWIRED_PROPS');
const AUTOWIRED_METHOD = Symbol('AUTOWIRED_METHOD');

let pageCtx;

export function getAutowiredCtx() {
    return pageCtx;
}

let wiringInstance;

export function doWire(instance, fn) {
    wiringInstance = instance;
    fn();
    wiringInstance = null;
}

export function isAutowired(proto, name) {
    return !!proto[AUTOWIRED_PROPS] && !!proto[AUTOWIRED_PROPS][name];
}

function getAutowiredConfiguration(classInstance) {
    const { app, ctx } = classInstance;
    let config = ctx._autowiredConfig;
    if (!config) {
        const { Configuration } = ctx;
        Configuration.prototype.ctx = ctx;
        Configuration.prototype.app = app;
        config = ctx._autowiredConfig = new Configuration();
        Configuration.prototype.ctx = Configuration.prototype.app = null;
        config.ctx = ctx;
        config.app = app;
    }
    return config;
}

function wire(classInstance, propName, resourceName) {
    const config = getAutowiredConfiguration(classInstance);
    pageCtx = classInstance.ctx;
    const wiredName = propName.replace(/^[_]/g, '') + '@' + resourceName;
    let val = config[wiredName];
    if (val === undefined) {
        val = config[wiredName] = config[resourceName];
    }
    if (val === undefined)
        throw new Error(
            "autowired: Dependency '" + resourceName + "' is not available! Make sure it is provided by Configuration!"
        );
    pageCtx = null;
    return val;
}

function defineAutowired(proto) {
    Object.defineProperty(proto, AUTOWIRED_METHOD, {
        configurable: true,
        value(propName, resourceName) {
            const proto = this.constructor.prototype;
            if (proto === this) {
                return;
            }
            return wire(this, propName, resourceName);
        }
    });
}

function configAutowired(proto, resourceName, name, descriptor, args) {
    const autowiredProps = Object.prototype.hasOwnProperty.call(proto, AUTOWIRED_PROPS)
        ? proto[AUTOWIRED_PROPS]
        : (proto[AUTOWIRED_PROPS] = proto[AUTOWIRED_PROPS] ? { ...proto[AUTOWIRED_PROPS] } : {});
    autowiredProps[name] = resourceName;

    const isDefine = !!proto[AUTOWIRED_METHOD];
    if (!isDefine) {
        defineAutowired(proto);
    }

    return {
        get() {
            return this[AUTOWIRED_METHOD](name, resourceName);
        }
    };
}

export function autowired<T>(proto, name, descriptor, args): T {
    if (wiringInstance) {
        if (isString(proto)) {
            const resourceName = proto;
            if (wiringInstance[resourceName]) {
                return wiringInstance[resourceName];
            }
            return wire(wiringInstance, resourceName, resourceName);
        }
        return proto;
    }

    if (isString(proto)) {
        const resourceName = proto;
        return (target, name, descriptor, args) => {
            return configAutowired(target, resourceName, name, descriptor, args);
        };
    }
    return configAutowired(proto, name.replace(/^[_]/g, ''), name, descriptor, args);
}
