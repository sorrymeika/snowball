import initializer from "./initializer";
import { isObject } from "../../utils";
import { source } from "./symbols";
import { reactTo } from "../Reaction";

export function object(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[source], name);
            const state = this[source].model(name).state;
            return state.facade || state.data;
        },
        set(val) {
            if (null != val && !isObject(val)) {
                throw new Error('property value must be object!');
            }
            this[source].model(name).set(true, val);
        }
    };
}