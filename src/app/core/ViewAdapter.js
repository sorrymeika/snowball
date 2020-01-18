import { IViewAdapter } from "../types";
import { nextTick, Reaction } from "../../vm";

class ViewAdapterManager {
    constructor() {
        this._adapters = [DefaultViewAdapter];
    }

    create(type, options) {
        for (let i = 0; i < this._adapters.length; i++) {
            const Adapter = this._adapters[i];
            if (Adapter.match(type)) {
                return new Adapter(type, options);
            }
        }
        return null;
    }

    push(viewAdapterClass) {
        this._adapters.push(viewAdapterClass);
    }
}

class DefaultViewAdapter implements IViewAdapter {
    static match(type) {
        return type.$$typeof == 'snowball#component';
    }

    constructor(type, { el, store }) {
        this.type = type;
        this.el = el;
        this.store = store;
    }

    init(props, cb) {
        this.reaction = new Reaction(() => {
            this.component.set(this.store);
        });

        this.reaction.track(() => {
            this.component = this.type({
                ...this.store
            });
        });
        this.component.appendTo(this.el);
        cb && nextTick(cb);
    }

    update(attributes, cb) {
        this.component.set(attributes);
        cb && nextTick(cb);
    }

    destroy() {
        this.component.destroy();
    }
}

export default new ViewAdapterManager();
