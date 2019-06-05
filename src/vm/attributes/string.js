import initializer from "./initializer";
import { source } from "./symbols";
import { isString } from "../../utils";
import { reactTo } from "../Reaction";

export function string(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[source], name);
            return this[source].get(name);
        },
        set(val) {
            if (null != val && !isString(val)) {
                throw new Error('property value must be string!');
            }
            this[source].set(name, val);
        }
    };
}