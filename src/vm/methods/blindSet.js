import { isModel } from "../predicates";
import { Model } from "../Model";
import { Collection } from "../Collection";
import { freezeObject } from "./connect";

export function blindSet(model, renew, keys, val) {
    var lastKey = keys.pop();
    var tmp;
    var key;
    var nextKey;
    var isArray;

    for (var i = 0, len = keys.length; i < len; i++) {
        key = keys[i];
        nextKey = keys[i + 1];
        isArray = /^\[(\d+)\]$/.test(nextKey);

        if (!isModel(model.state.observableProps[key])) {
            let defaultData;
            let index;
            if (isArray) {
                index = nextKey.slice(1, -1);
                defaultData = Array.from(index).fill({});
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
        }
    }
    return model.set(renew, lastKey, val);
}