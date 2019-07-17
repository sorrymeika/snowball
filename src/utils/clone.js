import { isArray, isObject } from './is';
import { equals, pick } from './object';

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

export function cloneObject(obj, keys) {
    return new ObjectClone(obj, keys);
}

function ObjectClone(obj, keys) {
    this.keys = keys;
    this._result = true;
    this.set(obj);
}

ObjectClone.prototype.set = function (obj) {
    var object = {};
    var keys = this.keys;
    if (keys) {
        var key;
        for (var i = 0, length = keys.length; i < length; i++) {
            key = keys[i];
            if (key in obj) object[key] = deepClone(obj[key]);
        }
    } else {
        _extend(object, obj, true);
    }
    this._clone = object;
    return this;
};

ObjectClone.prototype.merge = function (obj) {
    _extend(this._clone, obj, true);
    return this;
};

ObjectClone.prototype.equals = function (obj) {
    return (this._result = equals(this._clone, this.keys ? pick(obj, this.keys) : obj));
};

ObjectClone.prototype.equalsOrSet = function (obj) {
    if (!this.equals(obj))
        return this.set(obj).lastResult();
    return true;
};

ObjectClone.prototype.lastResult = function () {
    return this._result;
};

ObjectClone.prototype.object = function () {
    return this._clone;
};