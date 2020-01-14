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
        model.trigger('change', model.state.data);
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
                    const newData = {};
                    for (let name in parentState.data) {
                        newData[name] = parentState.data[name];
                    }
                    const oldVal = parentState.data[key];
                    newData[key] = value;
                    parentState.data = newData;
                    freezeObject(parentState.data, parent);
                    updateRefs(parent);
                    if (parentState.hasOnAttrChangeListener) {
                        parent.trigger('change:' + key, value, oldVal);
                    }
                    return;
                }
            }
        }
        parentState.data[key] = value;
    }
}