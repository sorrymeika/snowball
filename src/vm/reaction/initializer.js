import { Model } from "../objects/Model";
import { SymbolRelObserver } from "../symbols";
import { isObservable } from "../predicates";

const symbolReactiveProps = Symbol('reactiveProps');
export const symbolPropsInitializer = Symbol('propsInitializer');
const initedClasses = new WeakSet();
const instanceStore = new WeakSet();

function asModel(obj, constructor) {
    if (process.env.NODE_ENV === "development") {
        if (!obj instanceof constructor) {
            throw new Error('obj must instanceof' + constructor);
        }
        if (!isObservable(obj[SymbolRelObserver])) {
            throw new Error('unavailable object!');
        }
    }
    return obj[SymbolRelObserver];
}

function _init(obj, data) {
    const model = asModel(obj, this);
    model.state.initialized = false;
    model.set(data);
    model.state.initialized = true;
}

function init(obj, data) {
    if (data == null) return;
    if (instanceStore.has(obj)) throw new Error('obj was initialized!');
    _init.call(this, obj, data);
}

function _from(data, ...args) {
    const Klass = this;
    const instance = new Klass(...args);
    _init.call(this, instance, data);
    return instance;
}

function hoistStaticMethods(obj) {
    obj.init = init;
    obj.from = _from;
}

export function _isObservableClass(obsCtor) {
    return obsCtor && obsCtor.prototype[symbolReactiveProps];
}

export default function initializer(obj, name, descriptor) {
    if (!initedClasses.has(obj)) {
        initedClasses.add(obj);

        obj[symbolReactiveProps] = obj[symbolReactiveProps]
            ? { ...obj[symbolReactiveProps] }
            : {};

        hoistStaticMethods(obj.constructor);

        Object.defineProperty(obj, SymbolRelObserver, {
            configurable: true,
            get() {
                const proto = this.constructor.prototype;
                if (proto === this) {
                    return true;
                }

                let initProperties = {};

                const props = proto[symbolReactiveProps];
                if (props) {
                    const initProp = this[symbolPropsInitializer] = (name) => {
                        if (name in initProperties) {
                            return initProperties[name];
                        }
                        const desc = props[name];
                        return initProperties[name] = desc.initializer
                            ? desc.initializer.call(this)
                            : desc.value;
                    };
                    for (let key in props) {
                        initProp(key);
                    }
                    this[symbolPropsInitializer] = null;
                }

                const model = new (this.constructor.Model || Model)(initProperties);
                model.state.facade = this;

                instanceStore.add(this);

                Object.defineProperty(this, SymbolRelObserver, {
                    get() {
                        return model;
                    }
                });
                return model;
            }
        });
    }

    if (descriptor.initializer || descriptor.value !== undefined) {
        obj[symbolReactiveProps][name] = descriptor;
    }
}
