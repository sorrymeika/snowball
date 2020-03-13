import { readonlyObserver, Subject, IObservable, Observer } from "./objects/Observer";
import { isObservable } from "./predicates";
import { isPlainObject, isFunction, isString, isArray } from "../utils";
import { SymbolFrom, SymbolRelObserver } from "./symbols";
import List from "./objects/List";
import { Model } from "./objects/Model";

import * as attributes from "./reaction/types";

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
export const observable = (initalValue, execute, descriptor) => {
    // 装饰器模式
    if (isString(execute)) {
        return attributes.any(initalValue, execute, descriptor);
    }

    if (isFunction(initalValue)) {
        const [observer, set] = readonlyObserver(new Subject());
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
        initalValue = initalValue.get();
    }
    if (isPlainObject(initalValue)) {
        return new Model(initalValue);
    } else if (isArray(initalValue)) {
        return new List(initalValue);
    } else {
        return new Observer(initalValue);
    }
};

observable.number = attributes.number;
observable.string = attributes.string;
observable.object = attributes.object;
observable.array = attributes.array;
observable.boolean = attributes.boolean;

// TODO: @action
export const action = attributes.func;

function throwIsNotObservableError() {
    throw new Error(
        process.env.NODE_ENV === 'production'
            ? 'IsNotObservable'
            : 'data is not an observable array, you can use `observable(data)` to create a new observable object!'
    );
}

export function asObservable(data): IObservable {
    return data[SymbolFrom] || data[SymbolRelObserver] || (
        isObservable(data)
            ? data
            : throwIsNotObservableError()
    );
}

export default observable;

// test observable
if (process.env.NODE_ENV === 'development') {

    setTimeout(() => {
        class A {
            @observable
            a = 1;

            @observable
            b = this.a;

            @observable
            c = 'asdf';

            time = 1;
        }
        var a = new A();
        console.assert(a.a == a.b);

        var model = new Model();
        model.set({
            a
        });
        console.assert(model.get('a') === a);

        model.set({
            a: {
                name: 1
            }
        });
        console.assert(model.get('a') !== a && model.get('a').name == 1, 'model.a 应该被替换掉');

        // 深层
        model.set({
            a: {
                a
            }
        });
        console.assert(model.get('a.a') === a);
        console.assert(model.get('a').name == 1);
        console.assert(model.get('a.name') == 1);
    }, 0);
}
