import { getAutowiredCtx, autowired } from "../core/autowired";
import { getPropertyNames, defineProxyProperty, isString } from "../../utils";

const excludeProps = ['ctx', 'app', 'constructor'];

function isPublicProp(propName) {
    return typeof propName === 'string' && !excludeProps.includes(propName) && /^[a-z]/.test(propName);
}

const storeMap = new WeakMap();

function _mapViewModelToProps(provider, viewModelName, options?) {
    const vm = isString(viewModelName)
        ? provider[viewModelName] || autowired(viewModelName, options)
        : viewModelName;
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

export default function mapViewModelToProps(viewModelName, options?) {
    const ctx = getAutowiredCtx();
    return ctx
        ? _mapViewModelToProps(ctx._config._caller, viewModelName, options)
        : (provider) => _mapViewModelToProps(provider, viewModelName, options);
}