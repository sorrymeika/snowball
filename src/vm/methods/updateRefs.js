import { isCollection, isList } from "../predicates";
import { getMemberName, freezeObject } from "./connect";

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
    if (model.state.hasOnChangeListener) {
        model.trigger('change');
    }
}

function bubbleUpdate(parent, model, key, value) {
    const { state: parentState } = parent;
    if (parentState[key] !== value) {
        if (!parentState.setting) {
            if (isCollection(parent) || isList(parent)) {
                if (!parentState.inEach || (!parentState.arrayIsNew && (parentState.arrayIsNew = true))) {
                    parentState.data = [...parentState.data];
                    parentState.data[key] = value;
                    if (!parentState.inEach) {
                        freezeObject(parentState.data, parent);
                    }
                    updateRefs(parent);
                    return;
                }
            } else {
                if (!parentState.setting) {
                    parentState.data = {
                        ...parentState.data,
                        [key]: value
                    };
                    freezeObject(parentState.data, parent);
                    updateRefs(parent);
                    return;
                }
            }
        }
        parentState.data[key] = value;
    }
}