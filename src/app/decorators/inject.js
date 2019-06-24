import React, { Component, createElement } from 'react';
import { isString, isArray } from '../../utils';
import observer from './observer';
import { PageContext } from '../lib/ReactViewHandler';

function isStateless(component) {
    // `function() {}` has prototype, but `() => {}` doesn't
    // `() => {}` via Babel has prototype too.
    return !(component.prototype && component.prototype.render);
}

function createStoreInjector(grabStoresFn, target) {

    class Injector extends Component {
        static contextType = PageContext;

        render() {
            const { forwardRef, ...props } = this.props;

            const additionalProps = grabStoresFn(this.context || {}, props, target.injectorName || target.name) || {};
            for (let key in additionalProps) {
                props[key] = additionalProps[key];
            }

            if (!isStateless(target)) {
                props.ref = forwardRef;
            }

            return createElement(target, props);
        }
    }

    Injector = observer(Injector);

    const InjectHocRef = React.forwardRef((props, ref) =>
        React.createElement(Injector, { ...props, forwardRef: ref })
    );
    InjectHocRef.wrappedComponent = target;

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
    return function (baseStores, nextProps, injectorName) {
        storeNames.forEach(function (storeName) {
            // prefer props over stores
            if (storeName in nextProps)
                return;

            if (injectorName) {
                const nameWithPrefix = injectorName.replace(/^[A-Z]/, (c) => c.toLowerCase()) + storeName.replace(/^[a-z]/, (c) => c.toUpperCase());
                if (nameWithPrefix in baseStores) {
                    nextProps[storeName] = baseStores[nameWithPrefix];
                    return;
                }
            }

            if (!(storeName in baseStores))
                throw new Error(
                    "Snowball injector: Store '" +
                    storeName +
                    "' is not available! Make sure it is provided by some Provider"
                );
            nextProps[storeName] = baseStores[storeName];
        });
        return nextProps;
    };
}

function renameProps(mapper) {
    const keys = Object.keys(mapper);
    return function (baseStores, nextProps) {
        keys.forEach(function (storeName) {
            const propName = mapper[storeName];
            // prefer props over stores
            if (propName in nextProps)
                return;

            if (storeName in baseStores)
                nextProps[propName] = baseStores[storeName];
        });
        return nextProps;
    };
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
export default function inject(injection) {
    let grabStoresFn;

    if (typeof injection === "function") {
        grabStoresFn = compose([].slice.call(arguments));
    } else if (isString(injection)) {
        grabStoresFn = grabStoresByName([].slice.call(arguments));
    } else if (isArray(injection)) {
        grabStoresFn = grabStoresByName(injection);
    } else {
        grabStoresFn = renameProps(injection);
    }

    return function (componentClass) {
        return createStoreInjector(grabStoresFn, componentClass);
    };
}