import { SymbolRelObserver } from "../symbols";
import initializer from "./initializer";
import { reactTo } from "./Reaction";

export function createDescriptor(get, set) {
    return (target, name, descriptor) => {
        initializer(target, name, descriptor);

        return {
            enumerable: true,
            get() {
                reactTo(this[SymbolRelObserver], name);
                return get(this[SymbolRelObserver], name);
            },
            set(val) {
                set(this[SymbolRelObserver], name, val);
            }
        };
    };
}