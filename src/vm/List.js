import { Observer } from "./Observer";
import { isArray } from '../utils/is';
import { connect, disconnect } from './methods/connect';
import { source } from './attributes/symbols';
import { Collection, withMutations, initCollection } from './Collection';

export class ObserverList extends Collection {
    static createItem(data, index, parent) {
        return new Observer(data, index, parent);
    }
}

export default class List extends Observer {
    constructor(array, attributeName, parent) {
        super();
        initCollection.call(this, array, attributeName, parent);
    }

    get(i) {
        if (i == null) return this.state.data;
        return this.state.data[i];
    }

    set(array) {
        let length = this.length;

        if (!length) {
            this.add(array);
            return;
        }

        return withMutations(() => {
            let arrayLenth = array.length;
            for (let i = arrayLenth - 1; i < length; i++) {
                disconnect(this, this[i][source]);
                delete this[i];
                this.state.changed = true;
                this.state.data.pop();
            }

            const disposers = [];
            const connected = {};

            for (let i = 0; i < arrayLenth; i++) {
                let item = array[i];
                let sourceModel = item[source];

                if (item !== this[i]) {
                    connected[sourceModel.state.id] = true;
                    connect(this, sourceModel, i);

                    if (this[i]) {
                        disposers.push(this[i][source]);
                        this.state.data[i] = sourceModel.state.data;
                    } else {
                        this.state.data.push(sourceModel.state.data);
                        this.length++;
                    }

                    this[i] = item;
                }
            }

            for (let i = 0; i < disposers.length; i++) {
                if (!connected[disposers[i].state.id]) {
                    disconnect(this, disposers[i]);
                }
            }
        });
    }

    add(array) {
        let length = array.length;
        let inputIsArray = isArray(array);

        if (!inputIsArray) {
            array = [array];
        }
        let results = [];

        withMutations(() => {
            for (let i = 0; i < length; i++) {
                let item = array[i];
                let index = this.length;

                connect(this, item[source], index);

                this[index] = item;
                this.state.data[index] = item[source].state.data;
                this.length++;

                results.push(item);
            }
            this.state.changed = true;
        });

        return inputIsArray ? results : results[0];
    }
}