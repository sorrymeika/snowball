import initializer from "./initializer";
import { source } from "./symbols";
import { isNumber } from "../../utils";
import { reactTo } from "../Reaction";

export function number(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[source], name);
            return this[source].get(name);
        },
        set(val) {
            if (null != val && !isNumber(val)) {
                throw new Error('property value must be number!');
            }
            this[source].set(name, val);
        }
    };
}