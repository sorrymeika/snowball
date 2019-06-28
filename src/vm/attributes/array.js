import initializer from "./initializer";
import { SymbolObserver } from "../symbols";
import { reactTo } from "../Reaction";

export function array(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[SymbolObserver], name);
            return this[SymbolObserver].get(name);
        },
        set(val) {
            if (!Array.isArray(val)) {
                throw new Error('property value must be array!');
            }
            target[SymbolObserver].set(name, val || []);
        }
    };
}