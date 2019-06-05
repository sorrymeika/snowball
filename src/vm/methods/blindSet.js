import { Model } from "../Model";
import { isModel } from "../predicates";

export function blindSet(model, renew, keys, val) {
    var lastKey = keys.pop();
    var tmp;
    var key;

    for (var i = 0, len = keys.length; i < len; i++) {
        key = keys[i];

        if (!isModel(model.state.observableProps[key])) {
            tmp = model.state.observableProps[key] = new Model({}, key, model);
            model.state.data[key] = tmp.state.data;
            model = tmp;
        } else {
            model = model.state.observableProps[key];
        }
    }
    return model.set(renew, lastKey, val);
}