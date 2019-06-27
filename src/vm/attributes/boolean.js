import initializer from "./initializer";
import { SymbolObserver } from "./symbols";
import { isBoolean } from "../../utils";
import { reactTo } from "../Reaction";

export function boolean(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[SymbolObserver], name);
            return this[SymbolObserver].get(name);
        },
        set(val) {
            if (null != val && !isBoolean(val)) {
                throw new Error('property value must be boolean!');
            }
            this[SymbolObserver].set(name, val);
        }
    };
}