import initializer from "./initializer";
import { source } from "./symbols";
import { reactTo } from "../Reaction";

export function func(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            const observer = target[source];
            reactTo(observer, name);
            return observer.get(name);
        },
        set(val) {
            if (typeof val !== 'function') {
                throw new Error('property value must be function!');
            }
            const observer = target[source];
            observer.set(name, val.prototype
                ? val.bind(this)
                : val);
        }
    };
};