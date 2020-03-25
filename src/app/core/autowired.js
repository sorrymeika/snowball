
import { isString, isPlainObject } from "../../utils";

const AUTOWIRED_PROPS = Symbol('AUTOWIRED_PROPS');
const AUTOWIRED_METHOD = Symbol('AUTOWIRED_METHOD');


function formatName(name) {
    return name.replace(/^[_]/g, '');
}

function formatResourceName(resourceType: string, resourceName: string) {
    resourceName = formatName(resourceName).toLowerCase();
    resourceType = resourceType.toLowerCase();
    if (resourceName.endsWith(resourceType)) {
        resourceName = resourceName.slice(0, resourceType.length * -1);
    }
    return resourceName;
}

function formatWiredName(resourceType: string, resourceName: string) {
    return ('@' + resourceType + '#' + formatResourceName(resourceType, resourceName)).toLowerCase();
}

let pageCtx;
let wiringCaller;

export function getWiringInfo() {
    return {
        ctx: pageCtx,
        caller: wiringCaller
    };
}

export function withAutowiredScope(caller, fn) {
    const prevInstance = wiringCaller;
    wiringCaller = caller;
    const instance = fn();
    wiringCaller = prevInstance;
    return instance;
}

export function isAutowired(proto, name) {
    return !!proto[AUTOWIRED_PROPS] && !!proto[AUTOWIRED_PROPS][name];
}

function getConfiguration(classInstance, fn) {
    const { app, ctx } = classInstance;
    let config = ctx._config;
    if (!config) {
        const { Configuration } = ctx;
        Configuration.prototype.ctx = ctx;
        Configuration.prototype.app = app;
        config = ctx._config = new Configuration();
        Configuration.prototype.ctx = Configuration.prototype.app = null;
        config.ctx = ctx;
        config.app = app;
    }
    config._caller = classInstance;
    pageCtx = classInstance.ctx;

    const res = fn(config);

    pageCtx = null;
    config._caller = null;

    return res;
}

const wiringNames = {};

function wire(classInstance, resourceType, resourceName, options) {
    return getConfiguration(classInstance, (config) => {
        let val;
        let wiredName = formatWiredName(resourceType, resourceName);
        let callerInstance;

        if (options && options.level === 'instance') {
            callerInstance = classInstance;
        } else {
            callerInstance = config;
        }

        val = callerInstance[wiredName];
        if (val === undefined) {
            if (wiringNames[wiredName]) {
                throw new Error('circular reference: ' + wiredName);
            }
            wiringNames[wiredName] = true;
            try {
                const mapName = (formatResourceName(resourceType, resourceName) + resourceType).toLowerCase();
                const moduleNamesMap = config.__modules__;
                val = callerInstance[wiredName] = config[moduleNamesMap[mapName] || moduleNamesMap[resourceType.toLowerCase()]];
            } catch (error) {
                console.error(error);
            }
            delete wiringNames[wiredName];
            if (val === undefined)
                throw new Error(
                    "autowired: Dependency '" + resourceType + "' is not available! Make sure it is provided by Configuration!"
                );
        }

        return val;
    });
}

function defineAutowired(proto) {
    Object.defineProperty(proto, AUTOWIRED_METHOD, {
        configurable: true,
        value(resourceType, propName, options) {
            const proto = this.constructor.prototype;
            if (proto === this) {
                return;
            }
            return wire(this, resourceType, propName, options);
        }
    });
}

function configAutowired(proto, resourceType, name, descriptor, options) {
    if (typeof descriptor.get === 'function' || descriptor.set === 'function') {
        throw new Error('can not decorate `get` or `set` property!');
    }

    resourceType = formatName(resourceType);

    const autowiredProps = Object.prototype.hasOwnProperty.call(proto, AUTOWIRED_PROPS)
        ? proto[AUTOWIRED_PROPS]
        : (proto[AUTOWIRED_PROPS] = proto[AUTOWIRED_PROPS] ? { ...proto[AUTOWIRED_PROPS] } : {});
    autowiredProps[name] = resourceType;

    const isDefine = !!proto[AUTOWIRED_METHOD];
    if (!isDefine) {
        defineAutowired(proto);
    }

    return {
        get() {
            return this[AUTOWIRED_METHOD](resourceType, name, options);
        }
    };
}

export function autowired(resourceType, options?: { name?: 'string', level: 'ctx' | 'instance' }, descriptor?) {
    if (isString(resourceType) && isString(options)) {
        options = { name: options };
    }
    if (wiringCaller) {
        if (isString(resourceType)) {
            return wire(wiringCaller, resourceType, (options && options.name) || resourceType, options);
        }
        return null;
    }
    if (isPlainObject(resourceType) && !options) {
        options = resourceType;
        resourceType = '';
    }
    if (isString(resourceType)) {
        return (target, name, descriptor) => {
            return configAutowired(target, resourceType || name, (options && options.name) || name, descriptor, {
                level: 'ctx',
                ...options,
                autowiredType: 'autowired'
            });
        };
    }
    return configAutowired(resourceType, options, options, descriptor, {
        level: 'ctx',
        autowiredType: 'autowired'
    });
}

function wireParam(classInstance, paramName, options) {
    return getConfiguration(classInstance, (config) => {
        if (paramName in config.__params__) {
            return config.__params__[paramName];
        } else {
            const ctx = pageCtx;
            ctx.page.on('qschange', () => {
                classInstance[paramName] = getParamValue(ctx, paramName, options);
            });
            return getParamValue(ctx, paramName, options);
        }
    });
}

function getParamValue(ctx, paramName, options) {
    const paramVal = paramName in ctx.location.params
        ? ctx.location.params[paramName]
        : ctx.location.query[paramName];
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

function decorateParam(proto, paramName, propName, descriptor, options) {
    if (typeof descriptor.get === 'function' || descriptor.set === 'function') {
        throw new Error('can not decorate `get` or `set` property!');
    }

    paramName = paramName.replace(/^[_]/g, '');

    return {
        writable: true,
        configurable: true,
        initializer() {
            return wireParam(this, paramName, options);
        }
    };
}

export function param<T>(proto, propName, descriptor): T {
    if (isString(proto)) {
        const paramName = proto;
        return (target, name, descriptor) => {
            return decorateParam(target, paramName, name, descriptor, {
                type: 'any',
                ...propName,
                autowiredType: 'param'
            });
        };
    }

    return decorateParam(proto, propName, propName, descriptor, {
        type: 'any',
        autowiredType: 'param',
    });
}
