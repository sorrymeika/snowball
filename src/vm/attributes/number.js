import initializer from "./initializer";
import { SymbolObserver } from "./symbols";
import { isNumber } from "../../utils";
import { reactTo } from "../Reaction";

export function number(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[SymbolObserver], name);
            return this[SymbolObserver].get(name);
        },
        set(val) {
            if (null != val && !isNumber(val)) {
                throw new Error('property value must be number!');
            }
            this[SymbolObserver].set(name, val);
        }
    };
}