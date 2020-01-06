
import { isString } from "../../utils";

const AUTOWIRED_PROPS = Symbol('AUTOWIRED_PROPS');
const AUTOWIRED_METHOD = Symbol('AUTOWIRED_METHOD');

let pageCtx;

export function getAutowiredCtx() {
    return pageCtx;
}

let wiringInstance;

export function withAutowired(instance, fn) {
    const prevInstance = wiringInstance;
    wiringInstance = instance;
    fn();
    wiringInstance = prevInstance;
}

export function isAutowired(proto, name) {
    return !!proto[AUTOWIRED_PROPS] && !!proto[AUTOWIRED_PROPS][name];
}

function getAutowiredConfiguration(classInstance, fn) {
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
    config._autowiredFrom = classInstance;
    pageCtx = classInstance.ctx;

    const res = fn(config);

    pageCtx = null;
    config._autowiredFrom = null;

    return res;
}

function wire(classInstance, propName, resourceName, options) {
    return getAutowiredConfiguration(classInstance, (config) => {
        let val;
        let wiredName = ('#' + propName.replace(/^[_]/g, '') + '@' + resourceName).toLowerCase();
        let callerInstance;

        if (options && options.level === 'instance') {
            callerInstance = classInstance;
        } else {
            callerInstance = config;
        }

        val = callerInstance[wiredName];
        if (val === undefined) {
            val = callerInstance[wiredName] = config[resourceName];
            if (val === undefined)
                throw new Error(
                    "autowired: Dependency '" + resourceName + "' is not available! Make sure it is provided by Configuration!"
                );
        }

        return val;
    });
}

function defineAutowired(proto) {
    Object.defineProperty(proto, AUTOWIRED_METHOD, {
        configurable: true,
        value(propName, resourceName, options) {
            const proto = this.constructor.prototype;
            if (proto === this) {
                return;
            }
            return wire(this, propName, resourceName, options);
        }
    });
}

function configAutowired(proto, resourceName, name, descriptor, options) {
    if (typeof descriptor.get === 'function' || descriptor.set === 'function') {
        throw new Error('can not decorate `get` or `set` property!');
    }

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
            return this[AUTOWIRED_METHOD](name, resourceName, options);
        }
    };
}

export function autowired<T>(resourceName, options?: { level: 'ctx' | 'instance' }, descriptor?): T {
    if (wiringInstance) {
        if (isString(resourceName)) {
            return wire(wiringInstance, resourceName, resourceName, options);
        }
        return null;
    }

    if (isString(resourceName)) {
        return (target, name, descriptor) => {
            return configAutowired(target, resourceName, name, descriptor, {
                level: 'ctx',
                ...options,
                autowiredType: 'autowired'
            });
        };
    }
    return configAutowired(resourceName, options.replace(/^[_]/g, ''), options, descriptor, {
        level: 'ctx',
        autowiredType: 'autowired'
    });
}

function wireParam(classInstance, resourceName, options) {
    return getAutowiredConfiguration(classInstance, (config) => {
        if (resourceName in config.__params__) {
            return config.__params__[resourceName];
        } else {
            const paramVal = resourceName in pageCtx.location.params
                ? pageCtx.location.params[resourceName]
                : pageCtx.location.query[resourceName];
            if (paramVal == null) {
                return 'defaultValue' in options
                    ? options.defaultValue
                    : options.type === 'number'
                        ? 0
                        : options.type === 'string'
                            ? ''
                            : paramVal;
            } else if (options.type === 'string') {
                return paramVal;
            } else if (options.type === 'number' || /^-?\d+(\.\d+)?$/.test(paramVal)) {
                return Number(paramVal) || 0;
            } else if (options.type === 'bool' || options.type === 'boolean') {
                return paramVal && paramVal != 'false' && paramVal != '0';
            } else if (paramVal === 'true') {
                return true;
            } else if (paramVal === 'false') {
                return false;
            } else if (options.type === 'json') {
                try {
                    return JSON.parse(paramVal);
                } catch (error) {
                    return null;
                }
            } else {
                return paramVal;
            }
        }
    });
}

function decorateParam(proto, resourceName, propName, descriptor, options) {
    if (typeof descriptor.get === 'function' || descriptor.set === 'function') {
        throw new Error('can not decorate `get` or `set` property!');
    }

    return {
        writable: true,
        configurable: true,
        initializer() {
            return wireParam(this, resourceName, options);
        }
    };
}

export function param<T>(proto, propName, descriptor): T {
    if (isString(proto)) {
        const resourceName = proto;
        return (target, name, descriptor) => {
            return decorateParam(target, resourceName, name, descriptor, {
                type: 'any',
                ...propName,
                autowiredType: 'param'
            });
        };
    }

    return decorateParam(proto, propName.replace(/^[_]/g, ''), propName, descriptor, {
        type: 'any',
        autowiredType: 'param',
    });
}
