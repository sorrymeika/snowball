import { isNumber, isString, isObject, isBoolean, isArray } from "../../utils";
import { createDescriptor } from "./createDescriptor";
import List from "../objects/List";

function defaultGetter(observer, name) {
    return observer.get(name);
}

export const any = createDescriptor(
    (observer, name) => {
        const prop = observer.state.observableProps[name];
        return (prop && prop.state.facade) || observer.get(name);
    },
    (observer, name, val) => {
        if (!observer.state.observableProps[name]) {
            if (isArray(val)) {
                val = new List(val);
            }
        }
        observer.set(true, name, val);
    }
);

export const string = createDescriptor(
    defaultGetter,
    (observer, name, val) => {
        if (null != val && !isString(val)) {
            throw new Error('property value must be string!');
        }
        observer.set(name, val);
    }
);

export const number = createDescriptor(
    defaultGetter,
    (observer, name, val) => {
        if (null != val && !isNumber(val)) {
            throw new Error('property value must be number!');
        }
        observer.set(name, val);
    }
);

export const object = createDescriptor(
    (observer, name) => {
        const state = observer.model(name).state;
        return state.facade || state.data;
    },
    (observer, name, val) => {
        if (null != val && !isObject(val)) {
            throw new Error('property value must be object!');
        }
        observer.model(name).set(true, val);
    }
);

export const array = createDescriptor(
    defaultGetter,
    (observer, name, val) => {
        if (!Array.isArray(val)) {
            throw new Error('property value must be array!');
        }
        observer.set(name, val || []);
    }
);

export const func = createDescriptor(
    defaultGetter,
    (observer, name, val) => {
        if (typeof val !== 'function') {
            throw new Error('property value must be function!');
        }
        observer.set(name, val.bind(observer.state.facade));
    }
);

export const boolean = createDescriptor(
    defaultGetter,
    (observer, name, val) => {
        if (null != val && !isBoolean(val)) {
            throw new Error('property value must be boolean!');
        }
        observer.set(name, val);
    }
);