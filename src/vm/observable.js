import { Observer, readonlyObserver } from "./Observer";
import { isObservable } from "./predicates";
import { isPlainObject, isFunction, isString } from "../utils";
import { Model } from "./Model";
import { Collection } from "./Collection";
import State from "./State";
import Emitter from "./Emitter";
import { reactTo } from "./Reaction";

const propertyKey = Symbol('propertyKey');
const reactiveProps = Symbol('reactiveProps');
const initedClasses = new WeakMap();

/**
 * 可观察对象
 * @param {any} initalValue
 * @param {Function|string} [execute]
 * @example
 * const observer =observable(0|{}|[]|'')
 * const observer =observable((fn)=>{
 *   document.body.addEventListener('click', fn);
 *   return () => {
 *     document.body.removeEventListener('click', fn);
 *   }
 * })
 */
const observable = (initalValue, execute, descriptor) => {
    // 装饰器模式
    if (isString(execute)) {
        if (!initedClasses.has(initalValue)) {
            initedClasses.set(initalValue, true);

            initalValue[reactiveProps] = initalValue[reactiveProps]
                ? [...initalValue[reactiveProps]]
                : [];

            Object.defineProperty(initalValue, propertyKey, {
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
                                        : desc.get
                                            ? desc.get.call(instance)
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

                    Object.defineProperty(this, propertyKey, {
                        get() {
                            return model;
                        }
                    });

                    return model;
                }
            });
        }

        if (descriptor.initializer || descriptor.value !== undefined || descriptor.get) {
            const descriptors = initalValue[reactiveProps];
            const index = descriptors.findIndex(({ name }) => name === execute);
            const newDesc = {
                name: execute,
                desc: descriptor
            };
            if (index != -1) {
                descriptors[index] = newDesc;
            } else {
                descriptors.push(newDesc);
            }
        }

        return {
            enumerable: true,
            get() {
                const model = this[propertyKey];

                reactTo(model, execute);

                const prop = model.state.observableProps[execute];
                return (prop && prop.state.facade) || model.state.data[execute];
            },
            set(val) {
                this[propertyKey].set(execute, val);
            }
        };
    }

    if (isFunction(initalValue)) {
        const [observer, set] = readonlyObserver(new State());
        const dispose = initalValue(set);
        observer.on('destroy', dispose);
        return observer;
    }
    if (isFunction(execute)) {
        const [observer, set] = readonlyObserver(isObservable(initalValue) ? initalValue : observable(initalValue));
        execute(observer, set);
        return observer;
    }
    if (isObservable(initalValue)) {
        return initalValue.compute((data) => data);
    }
    if (isPlainObject(initalValue)) {
        return new Model(initalValue);
    } else if (Array.isArray(initalValue)) {
        return new Collection(initalValue);
    } else {
        return new Observer(initalValue);
    }
};

observable.interval = (msec) => () => observable(new Emitter(0), (countObserver, set) => {
    const id = setInterval(() => {
        set(countObserver + 1);
    }, msec);
    countObserver.on('destroy', () => {
        clearInterval(id);
    });
});

observable.delay = observable.timer = (msec) => () => observable(new Emitter(), (timerObserver, set) => {
    let id;
    const clearTimer = () => {
        clearTimeout(id);
    };
    id = setTimeout(() => {
        timerObserver
            .off('destroy', clearTimer);
        set(id);
        id = null;
    }, msec);
    timerObserver.on('destroy', clearTimer);
});

observable.fromPromise = (promise) => () => observable(new Emitter(), (observer, set) => {
    promise.then((res) => {
        set(res);
    });
});

export default observable;

// class A {
//     @observable
//     a = 1;

//     @observable
//     b = this.a;

//     @observable
//     c = 'asdf';
// }

// setTimeout(() => {
//     var a = new A();
//     console.log(a.a, a.c, a.b);
// }, 0);
