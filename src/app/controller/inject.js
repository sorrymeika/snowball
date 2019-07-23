import React, { Component, createElement } from 'react';
import { isString, isArray, isFunction } from '../../utils';
import { PageProviderContext } from '../core/ReactViewHandler';
import { observer } from './observer';

let pageContext;

export const getCurrentContext = () => {
    return pageContext;
};

function isStateless(component) {
    // `function() {}` has prototype, but `() => {}` doesn't
    // `() => {}` via Babel has prototype too.
    return !(component.prototype && component.prototype.render);
}

function createStoreInjector(grabStoresFn, componentClass, makeReactive) {

    const _isStateless = isStateless(componentClass);
    if (_isStateless) {
        makeReactive = true;
    } else {
        componentClass = observer(componentClass);
    }

    class Injector extends Component {
        static contextType = PageProviderContext;

        render() {
            const { forwardRef, ...props } = this.props;

            const additionalProps = grabStoresFn(this.context.store || {}, props, componentClass.injectorName || componentClass.name, this) || {};
            for (let key in additionalProps) {
                props[key] = additionalProps[key];
            }

            if (!_isStateless) {
                props.ref = forwardRef;
                return createElement(componentClass, props);
            }
            return componentClass(props);
        }
    }

    if (makeReactive) Injector = observer(Injector);

    const InjectHocRef = React.forwardRef((props, ref) =>
        React.createElement(Injector, { ...props, forwardRef: ref })
    );
    InjectHocRef.wrappedComponent = componentClass;

    return InjectHocRef;
}

function compose(grabStoresFns) {
    return function (stores, nextProps) {
        const newProps = {};
        grabStoresFns.forEach(function (grabStoresFn) {
            const additionalProps = grabStoresFn(stores, nextProps);
            for (let key in additionalProps) {
                if (key in nextProps)
                    continue;
                newProps[key] = additionalProps[key];
            }
        });
        return newProps;
    };
}

function grabStoresByName(storeNames) {
    return function (baseStores, nextProps, injectorName, injector) {
        storeNames.forEach(function (storeName) {
            mapStoreToProps(baseStores, nextProps, injectorName, injector, storeName);
        });
        return nextProps;
    };
}

function renameProps(mapper) {
    const keys = Object.keys(mapper);
    return function (baseStores, nextProps, injectorName, injector) {
        keys.forEach(function (storeName) {
            mapStoreToProps(baseStores, nextProps, injectorName, injector, storeName, mapper[storeName]);
        });
        return nextProps;
    };
}

function mapStoreToProps(baseStores, nextProps, injectorName, injector, storeName, mapName = storeName) {
    // prefer props over stores
    if (mapName in nextProps)
        return;

    if (injectorName) {
        const nameWithPrefix = injectorName.replace(/^[A-Z]/, (c) => c.toLowerCase()) + storeName.replace(/^[a-z]/, (c) => c.toUpperCase());
        if (nameWithPrefix in baseStores) {
            nextProps[mapName] = baseStores[nameWithPrefix];
            return;
        }

        if (injectFactoryInstance(baseStores, nextProps, nameWithPrefix + 'Factory', mapName)) {
            return;
        }
    }

    if (injectFactoryInstance(baseStores, nextProps, storeName + 'Factory', mapName)) {
        return;
    }

    if (!(storeName in baseStores))
        throw new Error(
            "Snowball injector: Store '" +
            storeName +
            "' is not available! Make sure it is provided by some Provider"
        );
    nextProps[mapName] = baseStores[storeName];
}

function injectFactoryInstance(baseStores, nextProps, factoryName, injector, mapName) {
    const factory = baseStores[factoryName];
    if (injector[factoryName]) {
        nextProps[mapName] = injector[factoryName];
        return true;
    }
    if (isFunction(factory)) {
        pageContext = baseStores.$context;
        injector[factoryName] = nextProps[mapName] = factory(nextProps);
        pageContext = null;
        return true;
    }
    return false;
}

/**
 * 注入组件的props
 * nextProps优先级高与stores
 *
 * @example
 * inject('storeName1', 'storeName2')(componentClass)
 *
 * inject((stores, nextProps) => ({
 *   storeName1: stores.storeName1
 * }))(componentClass)
 */
export function inject(injection) {
    let grabStoresFn;
    let makeReactive = false;

    if (typeof injection === "function") {
        makeReactive = true;
        grabStoresFn = compose([].slice.call(arguments));
    } else if (isString(injection)) {
        grabStoresFn = grabStoresByName([].slice.call(arguments));
    } else if (isArray(injection)) {
        grabStoresFn = grabStoresByName(injection);
    } else {
        grabStoresFn = renameProps(injection);
    }

    return function (componentClass) {
        return createStoreInjector(grabStoresFn, componentClass, makeReactive);
    };
}