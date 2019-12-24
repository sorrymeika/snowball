import initializer from "./initializer";
import { SymbolRelObserver } from "../symbols";
import { reactTo } from "../Reaction";

export function createDescriptor(set, get) {
    return (target, name, descriptor) => {
        initializer(target, name, descriptor);

        return {
            enumerable: true,
            get() {
                reactTo(this[SymbolRelObserver], name);
                return get(this[SymbolRelObserver], name);
            },
            set: function (val) {
                set(this[SymbolRelObserver], name, val);
            }
        };
    };
}