import { getAutowiredCtx, autowired } from "../core/autowired";
import { getPropertyNames, defineProxyProperty } from "../../utils";

const excludeProps = ['ctx', 'app', 'constructor'];

function isPublicProp(propName) {
    return typeof propName === 'string' && !excludeProps.includes(propName) && /^[a-z]/.test(propName);
}

const storeMap = new WeakMap();

function _mapViewModelToProps(viewModelName) {
    const vm = autowired(viewModelName);
    const propertyNames = getPropertyNames(vm);


    if (storeMap.has(vm)) {
        return storeMap.get(vm);
    }

    const store = {};
    storeMap.set(vm, store);

    propertyNames.forEach((propertyName) => {
        if (isPublicProp(propertyName)) {
            defineProxyProperty(store, propertyName, vm);
        }
    });

    return store;
}

export default function mapViewModelToProps(viewModelName) {
    return getAutowiredCtx()
        ? _mapViewModelToProps(viewModelName)
        : () => _mapViewModelToProps(viewModelName);
}