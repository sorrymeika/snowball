import { isPlainObject, isArray } from '../../utils/is';
import { isObservable, TYPEOF } from "../predicates";
import { reactTo } from "../reaction/Reaction";
import { Observer } from './Observer';
import { Collection } from './Collection';
import { Dictionary } from "./Dictionary";

export default class List extends Collection {
    static createItem(parent, index, data) {
        if (isObservable(data)) {
            data = data.get();
        }
        if (isPlainObject(data)) {
            return new Dictionary(data, index, parent);
        } else if (isArray(data)) {
            return new List(data, index, parent);
        } else {
            return new Observer(data, index, parent);
        }
    }

    get array() {
        reactTo(this);
        return this.state.data;
    }
}

List.prototype[TYPEOF] = 'List';