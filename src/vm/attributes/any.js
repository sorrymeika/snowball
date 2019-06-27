import initializer from "./initializer";
import { SymbolObserver } from "./symbols";
import { reactTo } from "../Reaction";

export function any(target, name, descriptor) {
    initializer(target, name, descriptor);

    return {
        enumerable: true,
        get() {
            reactTo(this[SymbolObserver], name);
            const prop = this[SymbolObserver].state.observableProps[name];
            return (prop && prop.state.facade) || this[SymbolObserver].get(name);
        },
        set(val) {
            this[SymbolObserver].set(name, val);
        }
    };
}