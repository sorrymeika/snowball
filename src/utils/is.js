var toString = Object.prototype.toString;

function is(type) {
    const objectTag = "[object " + type + "]";
    return function (obj) {
        return toString.call(obj) == objectTag;
    };
}

export const isObject = is("Object");

export const isSymbol = is("Symbol");

export const isRegExp = is("RegExp");

export const isArray = Array.isArray || is("Array");

export function isUndefined(val) {
    return val === undefined;
}

export function isNil(val) {
    return val == null;
}

export function isString(str) {
    return typeof str === 'string' || toString.call(str) == "[object String]";
}

export function isNumber(str) {
    return typeof str === 'number' || toString.call(str) == "[object Number]";
}

export function isBoolean(str) {
    return str === true || str === false;
}

export function isFunction(fn) {
    return typeof fn === 'function';
}

// 来自redux，性能差
// export function isPlainObject2(obj) {
//     if (typeof obj !== 'object' || obj === null) return false;

//     let proto = obj;
//     while (Object.getPrototypeOf(proto) !== null) {
//         proto = Object.getPrototypeOf(proto);
//     }

//     return Object.getPrototypeOf(obj) === proto;
// }

export function isPlainObject(obj) {
    if (typeof obj !== 'object' || obj === null) return false;

    return Object.getPrototypeOf(obj) === Object.prototype;
}

export function isEmptyObject(obj) {
    if (!obj) return false;

    for (var name in obj) {
        return false;
    }
    return true;
}

export function isNo(value) {
    return !value || (isArray(value) && !value.length) || (isObject(value) && isEmptyObject(value));
}

export function isYes(value) {
    return !isNo(value);
}

export function isThenable(thenable) {
    return thenable && typeof thenable === 'object' && typeof thenable.then === 'function';
}
