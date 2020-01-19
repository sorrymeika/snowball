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
observable.func = attributes.func;

function throwIsNotObservableError() {
    throw new Error('data is not an observable array, you can use `observable(data)` to create a new observable object!');
}

export function asObservable(data): IObservable {
    return data[SymbolFrom] || data[SymbolRelObserver] || (
        isObservable(data)
            ? data
            : throwIsNotObservableError()
    );
}

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
