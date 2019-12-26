
import { isString } from "../../utils";

const AUTOWIRED_PROPS = Symbol('AUTOWIRED_PROPS');
const AUTOWIRED_CONFIG = Symbol('AUTOWIRED_CONFIG');

export function _getAutowired(proto) {
    return proto[AUTOWIRED_CONFIG];
}

let pageCtx;

export function getAutowiredCtx() {
    return pageCtx;
}

function defineAutowired(proto) {
    Object.defineProperty(proto, AUTOWIRED_CONFIG, {
        configurable: true,
        get() {
            const proto = this.constructor.prototype;
            if (proto === this) {
                return true;
            }

            let config = this.ctx._currentConfig;
            if (!config) {
                config = this.ctx._currentConfig = this.ctx._config ? Object.defineProperties({}, this.ctx._config) : {};
                this.ctx._currentConfig[AUTOWIRED_CONFIG] = Object.defineProperties({}, this.app._config);
            }

            pageCtx = this.ctx;

            const autowiredProps = this[AUTOWIRED_PROPS];
            const properties = Object.keys(autowiredProps).reduce((properties, name) => {
                const resourceName = autowiredProps[name];
                const value = config[resourceName];
                properties[name] = value === undefined ? config[AUTOWIRED_CONFIG][resourceName] : value;
                return properties;
            }, {});

            pageCtx = null;

            Object.defineProperty(this, AUTOWIRED_CONFIG, {
                get() {
                    return properties;
                }
            });

            return properties;
        }
    });
}

function configAutowired(proto, resourceName, name, descriptor, args) {
    const isDefine = !!proto[AUTOWIRED_PROPS];
    const autowiredProps = Object.prototype.hasOwnProperty.call(proto, AUTOWIRED_PROPS)
        ? proto[AUTOWIRED_PROPS]
        : (proto[AUTOWIRED_PROPS] = proto[AUTOWIRED_PROPS] ? { ...proto[AUTOWIRED_PROPS] } : {});
    autowiredProps[name] = resourceName;

    if (!isDefine) {
        defineAutowired(proto);
    }

    return {
        get() {
            return this[AUTOWIRED_CONFIG][resourceName];
        }
    };
}

export function autowired(proto, name, descriptor, args) {
    if (isString(proto)) {
        const resourceName = proto;
        return (target, name, descriptor, args) => {
            return configAutowired(target, resourceName, name, descriptor, args);
        };
    }
    return configAutowired(proto, name, name, descriptor, args);
}
