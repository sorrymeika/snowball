import { isCollection, isList } from "../predicates";
import { getMemberName } from "./connect";

export function updateRefs(model) {
    model.state.version++;

    var parents = model.state.parents;
    if (parents) {
        var value = model.state.data;
        var i = -1;
        var length = parents.length;
        while (++i < length) {
            bubbleUpdate(parents[i], model, getMemberName(parents[i], model), value);
        }
    }
}

function bubbleUpdate(parent, model, key, value) {
    const { state } = parent;
    if (state[key] !== value) {
        if (!state.setting) {
            if (isCollection(parent) || isList(parent)) {
                if (!state.inEach || (!state.arrayIsNew && (state.arrayIsNew = true))) {
                    state.data = [...state.data];
                    updateRefs(parent);
                }
            } else {
                if (!state.setting) {
                    state.data = { ...state.data };
                    updateRefs(parent);
                }
            }
        }
        state.data[key] = value;
    }
}