import { SymbolObserver } from "../symbols";

export function connect(parent, child, name) {
    if (child.state.mapper[parent.state.id] === undefined) {
        !child.state.parents && (child.state.parents = []);
        child.state.parents.push(parent);
        setMapper(parent, child, name);
    }
}

export function disconnect(parent, child) {
    const parents = child.state.parents;
    if (parents) {
        let i = parents.length;
        while (--i >= 0) {
            if (parents[i] === parent) {
                let length = parents.length;
                while (++i < length) {
                    parents[i - 1] = parents[i];
                }
                parents.pop();
                break;
            }
        }
    }
    delete child.state.mapper[parent.state.id];
}

export function setMapper(parent, child, name) {
    child.state.mapper[parent.state.id] = name;
}

export function getMemberName(parent, child) {
    return child.state.mapper[parent.state.id];
}

export function addSymbolObserver(data, observer) {
    Object.defineProperty(data, SymbolObserver, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: observer
    });
}