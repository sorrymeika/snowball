import initializer from "./initializer";
import { source } from "./symbols";
import { reactTo } from "../Reaction";

export function array(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[source], name);
            return this[source].get(name);
        },
        set(val) {
            if (!Array.isArray(val)) {
                throw new Error('property value must be array!');
            }
            target[source].set(name, val || []);
        }
    };
}