import initializer from "./initializer";
import { SymbolObserver } from "./symbols";
import { isString } from "../../utils";
import { reactTo } from "../Reaction";

export function string(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[SymbolObserver], name);
            return this[SymbolObserver].get(name);
        },
        set(val) {
            if (null != val && !isString(val)) {
                throw new Error('property value must be string!');
            }
            this[SymbolObserver].set(name, val);
        }
    };
}