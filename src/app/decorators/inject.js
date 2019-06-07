import { Component, createElement } from 'react';
import AnyPropType from '../AnyPropType';
import { isString, isArray } from '../../snowball/utils';

function isStateless(component) {
    // `function() {}` has prototype, but `() => {}` doesn't
    // `() => {}` via Babel has prototype too.
    return !(component.prototype && component.prototype.render);
}

function createStoreInjector(grabStoresFn, target) {

    class Injector extends Component {
        static contextTypes = { store: AnyPropType }
        wrappedComponent = target;

        storeRef = instance => {
            this.wrappedInstance = instance;
        }

        render() {
            let newProps = {};
            for (let key in this.props)
                if (this.props.hasOwnProperty(key)) {
                    newProps[key] = this.props[key];
                }
            var additionalProps = grabStoresFn(this.context.store || {}, newProps, this.context) || {};
            for (let key in additionalProps) {
                newProps[key] = additionalProps[key];
            }

            if (!isStateless(target)) {
                newProps.ref = this.storeRef;
            }

            return createElement(target, newProps);
        }
    }

    return Injector;
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
    return function (baseStores, nextProps) {
        storeNames.forEach(function (storeName) {
            // prefer props over stores
            if (storeName in nextProps)
                return;
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
                nextProps[storeName] = baseStores[storeName];
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