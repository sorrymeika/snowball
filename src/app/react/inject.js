/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { Component, createElement, useMemo, useState, useEffect } from 'react';
import { isString, isArray, isFunction } from '../../utils';
import { Reaction } from '../../vm';
import { setCurrentCtx } from '../controller/controller';
import { observer } from './observer';
import { ctx } from '../core/createApplication';

export const PageContext = React.createContext();

function isStateless(component) {
    // `function() {}` has prototype, but `() => {}` doesn't
    // `() => {}` via Babel has prototype too.
    return !(component.prototype && component.prototype.render);
}

function makeStatelessComponentReacitve(statelessComponentClass) {
    const componentClass = (props) => {
        let [version, setRendering] = useState(0);

        const reaction = useMemo(() => {
            let ver = version;
            const reaction = new Reaction(() => {
                ver++;
                if (!reaction.isRenderingPending) {
                    reaction.isRenderingPending = true;
                    setRendering(ver);
                }
            }, true);
            return reaction;
        }, []);
        reaction.isRenderingPending = false;

        useEffect(() => () => reaction.destroy(), []);

        let element;
        reaction.track(() => {
            element = statelessComponentClass(props);
        });
        return element;
    };
    return componentClass;
}

export function makeComponentReacitve(componentClass) {
    return isStateless(componentClass)
        ? makeStatelessComponentReacitve(componentClass)
        : observer(componentClass);
}

function createStoreInjector(grabStoresFn, componentClass, makeReactive) {
    const _isStateless = isStateless(componentClass);
    if (_isStateless) {
        makeReactive = true;
        componentClass = makeStatelessComponentReacitve(componentClass);
    } else {
        componentClass = observer(componentClass);
    }

    class Injector extends Component {
        static contextType = PageContext;

        constructor(props, context) {
            super(props, context);

            this.injects = null;

            this.hooks = {
                useInject: (injects) => {
                    this.injects = Object.assign(this.injects || {}, injects);
                }
            };
        }

        render() {
            const { forwardRef, ...props } = this.props;
            const context = this.context || { app: ctx };

            const additionalProps = grabStoresFn(context, props, this) || {};
            for (let key in additionalProps) {
                props[key] = additionalProps[key];
            }
            if (!_isStateless) {
                props.ref = forwardRef;
            }

            if (this.injects) {
                Object.setPrototypeOf(this.injects, context);
                return createElement(PageContext.Provider, {
                    value: this.injects
                }, createElement(componentClass, props));
            }

            return createElement(componentClass, props);
        }
    }

    if (makeReactive) Injector = observer(Injector);

    const InjectHocRef = React.forwardRef((props, ref) =>
        React.createElement(Injector, { ...props, forwardRef: ref })
    );
    InjectHocRef.wrappedComponent = componentClass;
    InjectHocRef.$$isInjector = true;

    return InjectHocRef;
}

function compose(grabStoresFns) {
    return function (stores, nextProps, injector) {
        setCurrentCtx(stores.ctx);
        const newProps = {};
        grabStoresFns.forEach(function (grabStoresFn, i) {
            let additionalProps = (injector['REDUCER_' + i] || grabStoresFn)(stores, nextProps, injector.hooks);
            if (typeof additionalProps === 'function') {
                injector['REDUCER_' + i] = additionalProps;
                additionalProps = additionalProps(stores, nextProps);
            }
            if (additionalProps) {
                for (let key in additionalProps) {
                    // if (key in nextProps)
                    //     continue;
                    newProps[key] = additionalProps[key];
                }
            }
        });
        setCurrentCtx(null);
        return newProps;
    };
}

function grabStoresByName(storeNames) {
    return function (baseStores, nextProps, injector) {
        storeNames.forEach(function (storeName) {
            mapStoreToProps(baseStores, nextProps, injector, storeName);
        });
        return nextProps;
    };
}

function renameProps(mapper) {
    const keys = Object.keys(mapper);
    return function (baseStores, nextProps, injector) {
        keys.forEach(function (storeName) {
            mapStoreToProps(baseStores, nextProps, injector, storeName, mapper[storeName]);
        });
        return nextProps;
    };
}

function mapStoreToProps(baseStores, nextProps, injector, storeName, mapName = storeName) {
    // prefer props over stores
    if (mapName in nextProps)
        return;

    if (injectFactoryInstance(baseStores, nextProps, injector, storeName + 'Factory', mapName)) {
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

function injectFactoryInstance(baseStores, nextProps, injector, factoryName, mapName) {
    const factory = baseStores[factoryName];
    if (injector[factoryName]) {
        nextProps[mapName] = injector[factoryName];
        return true;
    }
    if (isFunction(factory)) {
        setCurrentCtx(baseStores.ctx);
        injector[factoryName] = nextProps[mapName] = factory(nextProps);
        setCurrentCtx(null);
        return true;
    }
    return false;
}

/**
 * 注入组件的props
 *
 * @example
 * // 将 `storeName1` 和 `storeName2` 注入到 props 中
 * inject('storeName1', 'storeName2')(componentClass)
 *
 * inject((stores, nextProps) => ({
 *   storeName1: stores.storeName1
 * }))(componentClass)
 *
 * // 不会将 `foo` 和 `bar` 注入到 props 中
 * inject(['foo', 'bar'], ({ foo, bar }) => ({
 *  barName: bar.name
 *  fooName: foo.name
 * }))(componentClass)
 */
export function inject(deps, injection) {
    let grabStoresFn;
    let makeReactive = false;

    if (typeof deps === "function") {
        makeReactive = true;
        grabStoresFn = compose([].slice.call(arguments));
    } else if (isString(deps)) {
        grabStoresFn = grabStoresByName([].slice.call(arguments));
    } else if (isArray(deps)) {
        if (typeof injection !== 'function') {
            throw new Error('injection must be function!!');
        }
        makeReactive = true;
        grabStoresFn = (baseStores, nextProps, injector) => {
            const depProps = { ...nextProps };
            deps.forEach(function (storeName, i) {
                mapStoreToProps(baseStores, depProps, injector, storeName);
            });
            return injection(depProps);
        };
    } else {
        grabStoresFn = renameProps(deps);
    }

    return function (componentClass) {
        return createStoreInjector(grabStoresFn, componentClass, makeReactive);
    };
}