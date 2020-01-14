import { isPlainObject, isArray } from '../../utils/is';
import { Collection } from '../Collection';
import { isObservable, TYPEOF } from "../predicates";
import { Dictionary } from "./Dictionary";
import { Value } from './Value';
import { reactTo } from "./Reaction";

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
            return new Value(data, index, parent);
        }
    }

    get array() {
        reactTo(this);
        return this.state.data;
    }

    get(i) {
        reactTo(this);
        return super.get(i);
    }
}

List.prototype[TYPEOF] = 'List';