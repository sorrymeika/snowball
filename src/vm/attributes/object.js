import initializer from "./initializer";
import { isObject } from "../../utils";
import { SymbolObserver } from "./symbols";
import { reactTo } from "../Reaction";

export function object(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[SymbolObserver], name);
            const state = this[SymbolObserver].model(name).state;
            return state.facade || state.data;
        },
        set(val) {
            if (null != val && !isObject(val)) {
                throw new Error('property value must be object!');
            }
            this[SymbolObserver].model(name).set(true, val);
        }
    };
}