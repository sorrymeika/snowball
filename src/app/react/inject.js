/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { Component, createElement, useMemo, useState, useEffect } from 'react';
import { isString, isArray, isFunction } from '../../utils';
import { Reaction } from '../../vm';
import { setCurrentCtx } from '../controller/controller';
import { observer } from './observer';
import { ctx, _getApplication } from '../core/createApplication';

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
                    const app = _getApplication();
                    if (app.currentActivity.transitionTask) {
                        app.currentActivity.transitionTask.then(() => {
                            setRendering(ver);
                        });
                    } else {
                        setRendering(ver);
                    }
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

function createInjector(grabDepsFn, componentClass, makeReactive) {
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

            this.deps = null;

            this.factoryInstances = {};
            this.hooks = {
                withDeps: (deps) => {
                    this.deps = Object.assign(this.deps || {}, deps);
                }
            };
            this.hooks.withDependencies = this.hooks.withDeps;
        }

        render() {
            const { forwardRef, ...props } = this.props;
            const context = this.context || { app: ctx };

            const additionalProps = grabDepsFn(context, props, this) || {};
            for (let key in additionalProps) {
                props[key] = additionalProps[key];
            }
            if (!_isStateless) {
                props.ref = forwardRef;
            }

            if (this.deps) {
                return createElement(PageContext.Provider, {
                    value: Object.assign(Object.create(context), this.deps)
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

function compose(grabDepsFns) {
    return function (dependencies, nextProps, injector) {
        setCurrentCtx(dependencies.ctx);
        const newProps = {};
        grabDepsFns.forEach(function (grabDepsFn, i) {
            let additionalProps = (injector['REDUCER_' + i] || grabDepsFn)(dependencies, nextProps, injector.hooks);
            if (typeof additionalProps === 'function') {
                injector['REDUCER_' + i] = additionalProps;
                additionalProps = additionalProps(dependencies, nextProps);
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

function grabDepsByName(depNames) {
    return function (dependencies, nextProps, injector) {
        depNames.forEach(function (depName) {
            mapDepsToProps(dependencies, nextProps, injector, depName);
        });
        return nextProps;
    };
}

function renameProps(mapper) {
    const keys = Object.keys(mapper);
    return function (dependencies, nextProps, injector) {
        keys.forEach(function (depName) {
            mapDepsToProps(dependencies, nextProps, injector, depName, mapper[depName]);
        });
        return nextProps;
    };
}

function mapDepsToProps(dependencies, nextProps, injector, depName, mapName = depName) {
    // prefer props over stores
    if (mapName in nextProps)
        return;

    if (injectFactoryInstance(dependencies, nextProps, injector, depName + 'Factory', mapName)) {
        return;
    }

    if (!(depName in dependencies))
        throw new Error(
            "Snowball injector: Dependency '" +
            depName +
            "' is not available! Make sure it is provided by Controller or some Provider"
        );
    nextProps[mapName] = dependencies[depName];
}

function injectFactoryInstance(dependencies, nextProps, injector, factoryName, mapName) {
    const factory = dependencies[factoryName];
    const { factoryInstances } = injector;
    if (factoryInstances[factoryName]) {
        nextProps[mapName] = factoryInstances[factoryName];
        return true;
    }
    if (isFunction(factory)) {
        setCurrentCtx(dependencies.ctx);
        factoryInstances[factoryName] = nextProps[mapName] = factory(nextProps);
        setCurrentCtx(null);
        return true;
    }
    return false;
}

/**
 * 注入组件的props
 *
 * @example
 * // 将 `depName1` 和 `depName2` 注入到 props 中
 * inject('depName1', 'depName2')(componentClass)
 *
 * inject((deps, nextProps) => ({
 *   depName1: deps.depName1
 * }))(componentClass)
 *
 * // 不会将 `foo` 和 `bar` 注入到 props 中
 * inject(['foo', 'bar'], ({ foo, bar }) => ({
 *  barName: bar.name
 *  fooName: foo.name
 * }))(componentClass)
 */
export function inject(deps, injection) {
    let grabDepsFn;
    let makeReactive = false;

    if (typeof deps === "function") {
        makeReactive = true;
        grabDepsFn = compose([].slice.call(arguments));
    } else if (isString(deps)) {
        grabDepsFn = grabDepsByName([].slice.call(arguments));
    } else if (isArray(deps)) {
        if (typeof injection !== 'function') {
            throw new Error('injection must be function!!');
        }
        makeReactive = true;
        grabDepsFn = (dependencies, nextProps, injector) => {
            const depProps = { ...nextProps };
            deps.forEach(function (depName, i) {
                mapDepsToProps(dependencies, depProps, injector, depName);
            });
            return injection(depProps);
        };
    } else {
        grabDepsFn = renameProps(deps);
    }

    return function (componentClass) {
        return createInjector(grabDepsFn, componentClass, makeReactive);
    };
}