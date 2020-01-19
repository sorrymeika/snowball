import { get, isString, isNumber } from "../../utils";
import { reactTo } from "../reaction/Reaction";
import { castPath } from "../../utils/castPath";
import { isModel, isDictionary, isObservable } from "../predicates";

export function getProperty(model, path) {
    const { data } = model.state;
    if (path == null || path == '') {
        reactTo(model);
        return data;
    }

    if (!data) {
        reactTo(model);
        return undefined;
    }
    const keys = isNumber(path) ? [path] : isString(path) ? castPath(path) : path;

    if (isModel(model) || isDictionary(model)) {
        const firstKey = keys.shift();
        if (keys.length == 0) {
            reactTo(model, firstKey);
            return data[firstKey];
        } else {
            const subModel = isModel(model) ? model.state.observableProps[firstKey] : data[firstKey];
            if (isObservable(subModel)) {
                return getProperty(subModel, keys);
            } else {
                reactTo(model, firstKey);
                return get(subModel, keys);
            }
        }
    } else {
        reactTo(model);
    }
    return get(data, keys);
}