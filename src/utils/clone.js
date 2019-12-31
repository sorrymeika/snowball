import { isArray, isObject } from './is';

var slice = Array.prototype.slice;

function _extend(target, source, deep) {
    var isObj, isArr;
    for (var key in source) {
        if (key === 'constructor' && typeof source[key] === 'function') {
            continue;
        }
        if (key === '__proto__') {
            continue;
        }
        if (deep && (((isObj = isObject(source[key])) && !(isArr = false)) || (isArr = isArray(source[key])))) {
            if (isObj && !isObject(target[key]))
                target[key] = {};
            if (isArr && !isArray(target[key]))
                target[key] = [];
            _extend(target[key], source[key], deep);
        }
        else if (source[key] !== undefined) target[key] = source[key];
    }
    return target;
}

export function extend(target) {
    var deep, args = slice.call(arguments, 1);
    if (typeof target == 'boolean') {
        deep = target;
        target = args.shift();
    }

    args.forEach(function (arg) { _extend(target, arg, deep); });
    return target;
}

export function clone(data, deep) {
    switch (toString.call(data)) {
        case '[object Object]':
            return _extend({}, data, deep);
        case '[object Array]':
            return _extend([], data, deep);
        default:
            return data;
    }
}

export function deepClone(data) {
    return clone(data, true);
}