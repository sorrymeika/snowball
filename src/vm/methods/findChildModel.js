import { isCollection } from "../predicates";

export function findChildModel(model, paths) {
    if (!paths || !paths.length) return model;

    var i = -1;
    var length = paths.length;
    var path;

    while (++i < length && model) {
        path = paths[i];
        model = (isCollection(model) ? model : model.state.observableProps)[path];
    }

    return model;
}
