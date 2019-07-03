import { isArray, isString } from './is';
import { castPath } from './castPath';

var hasOwnProperty = Object.prototype.hasOwnProperty;
var ArrayProto = Array.prototype;
var slice = ArrayProto.slice;
var concat = ArrayProto.concat;

function classExtend(proto) {
    var parent = this,
        child = hasOwnProperty.call(proto, 'constructor') ? proto.constructor : function () {
            return parent.apply(this, arguments);
        };

    var Surrogate = function () {
        this.constructor = child;
    };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    for (var key in proto)
        child.prototype[key] = proto[key];

    for (var keyOfSuper in parent)
        child[keyOfSuper] = parent[keyOfSuper];

    child.prototype.__super__ = parent.prototype;

    return child;
}

export function createClass(proto) {
    var func = hasOwnProperty.call(proto, 'constructor') ? proto.constructor : function () {
    };
    func.prototype = proto;
    func.prototype.constructor = func;
    func.extend = classExtend;
    return func;
}

export function mixin(...mixins) {
    class Mix {
        constructor(...args) {
            this.initialize && this.initialize(...args);

            let i = -1;
            let newMixin;

            while (++i < mixins.length) {
                newMixin = new mixins[i](...args);

                copyProperties(this, newMixin);
                copyProperties(this.prototype, newMixin.prototype);
            }
        }
    }

    let i = -1;
    let item;

    while (++i < mixins.length) {
        item = mixins[i];
        copyProperties(Mix, item);
        copyProperties(Mix.prototype, item.prototype);
    }

    return Mix;
}

function copyProperties(target = {}, source = {}) {
    const ownPropertyNames = Object.getOwnPropertyNames(source);

    ownPropertyNames
        .filter(key => !/^(prototype|name|constructor)$/.test(key))
        .forEach(key => {
            const desc = Object.getOwnPropertyDescriptor(source, key);

            Object.defineProperty(target, key, desc);
        });
}

class MixinBuilder {

    constructor(superclass) {
        this.superclass = superclass || class { };
    }

    /**
     * Applies `mixins` in order to the superclass given to `mix()`.
     *
     * @param {Array.<Mixin>} mixins
     * @return {Function} a subclass of `superclass` with `mixins` applied
     */
    with(...mixins) {
        return mixins.reduce((c, m) => m(c), this.superclass);
    }
}

export function mix(superclass) {
    return new MixinBuilder(superclass);
}

/**
 * inlined Object.is polyfill to avoid requiring consumers ship their own
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
export function is(x: mixed, y: mixed): boolean {
    // SameValue algorithm
    // Steps 1-5, 7-10
    if (x === y) {
        // Steps 6.b-6.e: +0 != -0
        // Added the nonzero y check to make Flow happy, but it is redundant
        return x !== 0 || y !== 0 || 1 / x === 1 / y;
    } else {
        // Step 6.a: NaN == NaN
        // eslint-disable-next-line no-self-compare
        return x !== x && y !== y;
    }
}

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export function shallowEqual(objA: mixed, objB: mixed): boolean {
    if (is(objA, objB)) {
        return true;
    }

    if (typeof objA !== 'object' || objA === null ||
        typeof objB !== 'object' || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
        return false;
    }

    // Test for A's keys different from B.
    for (let i = 0; i < keysA.length; i++) {
        if (
            !hasOwnProperty.call(objB, keysA[i]) ||
            !is(objA[keysA[i]], objB[keysA[i]])
        ) {
            return false;
        }
    }

    return true;
}

/**
 * 判断两个 Object/Array 是否相等
 *
 * @param {any} a
 * @param {any} b
 * @param {boolean} [eqeqeq] 是否全等`===`
 */
export function equals(a, b, eqeqeq = false) {
    if (eqeqeq ? is(a, b) : a == b) return true;

    var typeA = toString.call(a);
    var typeB = toString.call(b);
    var i;

    if (typeA !== typeB) return false;

    switch (typeA) {
        case '[object Object]':
            var keysA = Object.keys(a);
            if (keysA.length != Object.keys(b).length) {
                return false;
            }

            var key;
            for (i = keysA.length - 1; i >= 0; i--) {
                key = keysA[i];
                if (
                    !hasOwnProperty.call(b, key) || !equals(a[key], b[key], eqeqeq)
                ) {
                    return false;
                }
            }
            break;
        case '[object Array]':
            if (a.length !== b.length) {
                return false;
            }
            for (i = a.length - 1; i >= 0; i--) {
                if (!equals(a[i], b[i], eqeqeq)) {
                    return false;
                }
            }
            break;
        case '[object Date]':
            return +a === +b;
        case '[object RegExp]':
            return ('' + a) === ('' + b);
        default:
            if (eqeqeq ? !is(a, b) : a != b) return false;
    }

    return true;
}

export function same(a, b) {
    return equals(a, b, true);
}

/**
 * 判断一个`Object`和另外一个`Object`是否`keys`重合且值相等
 *
 * @param {Object|Array} parent
 * @param {Object|any} obj
 */
export function contains(parent, obj) {
    var type = toString.call(parent);

    switch (type) {
        case '[object Object]':
            for (var key in obj) {
                if (obj[key] !== parent[key]) return false;
            }
            break;
        case '[object Array]':
            if (!isArray(obj)) return parent.indexOf(obj) != -1;

            for (var i = obj.length; i >= 0; i--) {
                if (parent.indexOf(obj[i]) == -1) return false;
            }
            break;
        default:
            return obj == parent;
    }
    return true;
}

export function set(data, fullPath, value) {
    const paths = fullPath.replace(/(\[\d+\])/g, '.$1')
        .split('.')
        .filter((name) => name);

    let res = data;
    let prevKey;
    let prevData;

    for (let i = 0, max = paths.length - 1; i <= max; i++) {
        let key = paths[i];
        let isInArray = /^\[(\d+)\]$/.test(key);
        if (isInArray) {
            key = Number(RegExp.$1);
        }

        if (res == null) {
            res = isInArray ? [] : {};
            if (prevData) {
                prevData[prevKey] = res;
            }
        }

        prevKey = key;
        prevData = res;

        if (i === max) {
            res[key] = value;
        } else {
            res = res[key];
        }
    }

    return data;
}

export function get(data, path) {
    if (isString(path)) {
        path = castPath(path);
    }

    for (var i = 0, len = path.length; i < len; i++) {
        if (data == null)
            return undefined;
        data = data[path[i]];
    }

    return data;
}

// Note: this method is deprecated
export function value(data, paths) {
    console.error('`util.value` is deprecated use `util.get` instead!!');
    return get(data, paths);
}

export function at(data, paths) {
    let index = -1;
    const length = paths.length;
    const result = new Array(length);
    const skip = data == null;

    while (++index < length) {
        result[index] = skip ? undefined : get(data, paths[index]);
    }
    return result;
}

/**
 * pick Object
 */
export function pick(obj, iteratee) {
    var result = {},
        key;
    if (obj == null) return result;
    if (typeof iteratee === 'function') {
        for (key in obj) {
            var value = obj[key];
            if (iteratee(value, key, obj)) result[key] = value;
        }
    } else {
        var keys = concat.apply([], slice.call(arguments, 1));
        for (var i = 0, length = keys.length; i < length; i++) {
            key = keys[i];
            if (key in obj) result[key] = obj[key];
        }
    }
    return result;
}

export function excludeProps(obj, props) {
    const iteratee = typeof props === 'function' ? props : (key) => props.includes(key);
    return Object.keys(obj).filter((key, i) => !iteratee(key, i))
        .reduce((newProps, key) => {
            newProps[key] = obj[key];
            return newProps;
        }, {});
}