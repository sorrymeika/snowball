
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

export function isAutowired(proto, name) {
    return !!proto[AUTOWIRED_PROPS][name];
}

function defineAutowired(proto) {
    Object.defineProperty(proto, AUTOWIRED_CONFIG, {
        configurable: true,
        get() {
            const proto = this.constructor.prototype;
            if (proto === this) {
                return true;
            }

            let wired = this.ctx._wired;
            if (!wired) {
                wired = this.ctx._wired = new this.ctx.Configuration();
            }

            const autowiredProps = this[AUTOWIRED_PROPS];
            const properties = Object.keys(autowiredProps).reduce((properties, name) => {
                pageCtx = this.ctx;

                const resourceName = autowiredProps[name];
                const wiredName = name.replace(/^[_]/, '') + '@' + resourceName;
                let val = wired[wiredName];
                if (val === undefined) {
                    val = wired[wiredName] = wired[resourceName];
                }
                properties[name] = val;
                pageCtx = null;

                return properties;
            }, {});


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
