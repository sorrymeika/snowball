import { Model } from "../Model";
import { source } from "./symbols";
import { isObservable } from "../predicates";

const reactiveProps = Symbol('reactiveProps');
const initedClasses = new WeakMap();
const instanceStore = new WeakSet();

function getSource(obj, constructor) {
    if (process.env.NODE_ENV === "development") {
        if (!obj instanceof constructor) {
            throw new Error('obj must instanceof' + constructor);
        }
        if (!isObservable(obj[source])) {
            throw new Error('unavailable object!');
        }
    }
    return obj[source];
}

function _init(obj, data) {
    const model = getSource(obj, this);
    model.state.initialized = false;
    model.set(data);
    model.state.initialized = true;
}

function init(obj, data) {
    if (data == null) return;
    if (instanceStore.has(obj)) throw new Error('obj was initialized!');
    _init.call(this, obj, data);
}

function _of(data) {
    const Klass = this;
    const instance = new Klass();
    _init.call(this, instance, data);
    return instance;
}

export function hoistStaticMethods(obj) {
    obj.init = init;
    obj.of = _of;
}

export default function initializer(obj, name, descriptor) {
    if (!initedClasses.has(obj)) {
        initedClasses.set(obj, true);

        obj[reactiveProps] = obj[reactiveProps]
            ? [...obj[reactiveProps]]
            : [];

        hoistStaticMethods(obj.constructor);

        Object.defineProperty(obj, 'asModel', {
            writable: false,
            enumerable: false,
            configurable: false,
            value: function () {
                return this[source];
            }
        });

        Object.defineProperty(obj, source, {
            configurable: true,
            get() {
                const proto = this.constructor.prototype;
                if (proto === this) {
                    return true;
                }

                let initProperties;

                const props = proto[reactiveProps];
                if (props) {
                    const instance = Object.create(this, props.reduce((result, { name, desc }) => {
                        result[name] = {
                            get() {
                                return desc.initializer
                                    ? desc.initializer.call(instance)
                                    : desc.value;
                            }
                        };
                        return result;
                    }, {}));
                    initProperties = props.reduce((result, { name }) => {
                        result[name] = instance[name];
                        return result;
                    }, {});
                } else {
                    initProperties = {};
                }

                const model = new Model(initProperties);
                model.state.facade = this;

                instanceStore.add(this);

                Object.defineProperty(this, source, {
                    get() {
                        return model;
                    }
                });
                return model;
            }
        });
    }

    if (descriptor.initializer || descriptor.value !== undefined) {
        const descriptors = obj[reactiveProps];
        const index = descriptors.findIndex((item) => item.name === name);
        const newDesc = {
            name,
            desc: descriptor
        };
        if (index != -1) {
            descriptors[index] = newDesc;
        } else {
            descriptors.push(newDesc);
        }
    }
}
