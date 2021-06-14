import { isArray, isPlainObject } from "../../utils";
import { createDescriptor } from "./createDescriptor";
import List from "../objects/List";
import { Dictionary } from "../objects/Dictionary";

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

export const dictionary = createDescriptor(
    defaultGetter,
    (observer, name, val) => {
        if (null != val && !isPlainObject(val)) {
            throw new Error('property value must be plain object!');
        }
        if (!observer.state.observableProps[name]) {
            val = new Dictionary(val);
        }
        observer.set(true, name, val);
    }
);

export const collection = createDescriptor(
    defaultGetter,
    (observer, name, val) => {
        if (null != val && !Array.isArray(val)) {
            throw new Error('property value must be array!');
        }
        observer.set(name, val || []);
    }
);