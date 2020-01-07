import { isNumber, isString, isObject, isBoolean } from "../../utils";
import { createDescriptor } from "./createDescriptor";

export const any = createDescriptor(
    (observer, name) => {
        const prop = observer.state.observableProps[name];
        return (prop && prop.state.facade) || observer.get(name);
    },
    (observer, name, val) => {
        observer.set(name, val);
    }
);

export const string = createDescriptor(
    (observer, name) => {
        return observer.get(name);
    },
    (observer, name, val) => {
        if (null != val && !isString(val)) {
            throw new Error('property value must be string!');
        }
        observer.set(name, val);
    }
);

export const number = createDescriptor(
    (observer, name) => {
        return observer.get(name);
    },
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
    (observer, name) => {
        return observer.get(name);
    },
    (observer, name, val) => {
        if (!Array.isArray(val)) {
            throw new Error('property value must be array!');
        }
        observer.set(name, val || []);
    }
);

export const func = createDescriptor(
    (observer, name) => {
        return observer.get(name);
    },
    (observer, name, val) => {
        if (typeof val !== 'function') {
            throw new Error('property value must be function!');
        }
        observer.set(name, val.bind(observer.state.facade));
    }
);

export const boolean = createDescriptor(
    (observer, name) => {
        return observer.get(name);
    },
    (observer, name, val) => {
        if (null != val && !isBoolean(val)) {
            throw new Error('property value must be boolean!');
        }
        observer.set(name, val);
    }
);