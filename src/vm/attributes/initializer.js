import { Model } from "../Model";
import { source } from "./symbols";
import { isObservable } from "../predicates";
import { isString } from "../../utils";

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

function from(data) {
    const Klass = this;
    const instance = new Klass();
    _init.call(this, instance, data);
    return instance;
}

function observe(obj, arg1, arg2) {
    getSource(obj, this).observe(arg1, arg2);
    return () => unobserve(obj, arg1, arg2);
}

function unobserve(obj, arg1, arg2) {
    getSource(obj, this).unobserve(arg1, arg2);
}

function compute(obj, arg1, arg2) {
    return getSource(obj, this).compute(arg1, arg2);
}

function get(obj, key) {
    return getSource(obj, this).get(key);
}

function set(obj, arg1, arg2) {
    let source = getSource(obj, this);
    let fn;
    if (isString(arg1)) {
        source = source._(arg1);
        fn = arg2;
    } else {
        fn = arg1;
    }
    if (typeof fn === 'function') {
        fn(source);
    } else {
        source.set(fn);
    }
}

const connectionStore = new WeakMap();

function getInstanceStore(receiver, uniqueId) {
    let connection;
    if (connectionStore.has(receiver)) {
        connection = connectionStore.get(receiver);
    } else {
        connection = new Map();
        connectionStore.set(receiver, connection);
    }

    let store;
    if (connection.has(this)) {
        store = connection.get(this);
    } else {
        store = {};
        connection.set(this, store);
    }

    return store;
}

function getCache(receiver, uniqueId, onCreate) {
    let store = getInstanceStore.call(this, receiver, uniqueId);
    let instance;
    if (!(instance = store[uniqueId])) {
        const Klass = this;
        instance = store[uniqueId] = new Klass();
        onCreate && onCreate(instance);
    }
    return instance;
}

function hasCache(receiver, uniqueId) {
    let store = getInstanceStore.call(this, receiver, uniqueId);
    return !!store[uniqueId];
}

function setCache(receiver, uniqueId, model) {
    let store = getInstanceStore.call(this, receiver, uniqueId);
    return store[uniqueId] = model;
}

function removeCache(receiver, uniqueId) {
    let store = getInstanceStore.call(this, receiver, uniqueId);
    let data = store[uniqueId];
    if (data !== undefined) {
        delete store[uniqueId];
    }
    return data;
}

export function hoistStaticMethods(obj) {
    obj.init = init;
    obj.from = from;
    obj.observe = observe;
    obj.unobserve = unobserve;
    obj.compute = compute;
    obj.get = get;
    obj.set = set;
    obj.getCache = getCache;
    obj.hasCache = hasCache;
    obj.setCache = setCache;
    obj.removeCache = removeCache;
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
