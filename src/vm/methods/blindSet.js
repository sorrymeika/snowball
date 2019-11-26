import { isObservable } from "../predicates";
import { Model } from "../Model";
import { Collection } from "../Collection";
import { freezeObject } from "./connect";

export function blindSet(model, renew, keys, val) {
    var tmp;
    var key;
    var nextKey;
    var isArray;
    var index;
    var defaultData;

    if (keys.indexOf('__proto__') !== -1) {
        throw new Error('不可设置`__proto__`');
    }

    for (var i = 0, len = keys.length; i < len; i++) {
        key = keys[i];
        nextKey = keys[i + 1];
        isArray = /^\[(\d+)\]$/.test(nextKey);

        if (!isObservable(model.state.observableProps[key])) {
            if (isArray) {
                index = Number(nextKey.slice(1, -1));
                defaultData = Array(index + 1).fill({});
                i++;
            } else {
                defaultData = {};
            }

            const data = Object.assign({}, model.state.data);
            model.state.data = data;
            tmp = model.state.observableProps[key] = isArray
                ? new Collection(defaultData, key, model)
                : new Model(defaultData, key, model);
            data[key] = tmp.state.data;
            freezeObject(data, model);

            model = isArray ? tmp[index] : tmp;
        } else {
            model = model.state.observableProps[key];
            if (isArray) {
                index = Number(nextKey.slice(1, -1));
                model = model[index];
                i++;
            }
        }

        if (i >= len - 2) {
            return isArray && i === len - 1
                ? model.set(renew, val)
                : model.set(renew, keys[len - 1], val);
        }
    }
}