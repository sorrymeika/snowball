import { get, isString } from "../../utils";
import { reactTo } from "../Reaction";
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
    const keys = isString(path) ? castPath(path) : path;

    if (isModel(model) || isDictionary(model)) {
        const firstKey = keys.shift();
        if (keys.length == 0) {
            reactTo(model, firstKey);
            return data[firstKey];
        } else {
            return getProperty(isModel(model) ? model.state.observableProps[firstKey] : data[firstKey], keys);
        }
    } else if (isObservable(model)) {
        reactTo(model);
    }
    return get(data, keys);
}