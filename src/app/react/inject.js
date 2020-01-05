/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { createElement, useMemo, useState, useEffect, useContext } from 'react';
import { isString, isArray, isFunction } from '../../utils';
import { Reaction } from '../../vm';
import { setCurrentCtx } from '../controller/controller';
import { observer } from './observer';
import { _getApplication } from '../core/createApplication';
import { doWire, autowired } from '../controller/autowired';

export const PageContext = React.createContext();

function isStateless(component) {
    // `function() {}` has prototype, but `() => {}` doesn't
    // `() => {}` via Babel has prototype too.
    return !(component.prototype && component.prototype.render);
}

function makeStatelessComponentReacitve(statelessComponentFn) {
    const componentFn = (props, forwardRef) => {
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
            element = statelessComponentFn(props, forwardRef);
        });
        return element;
    };
    return componentFn;
}

export function makeComponentReacitve(componentClass) {
    return isStateless(componentClass)
        ? makeStatelessComponentReacitve(componentClass)
        : observer(componentClass);
}

function createInjector(grabDepsFn, componentClass) {
    const _isStateless = isStateless(componentClass);
    const WrappedComponent = componentClass;

    if (!_isStateless) {
        componentClass = observer(componentClass);
    }

    const Injector = React.forwardRef(makeStatelessComponentReacitve((props, forwardRef) => {
        const context = useContext(PageContext);
        const [injector] = useState({
            factoryInstances: {}
        });
        let newProps = Object.assign({}, props);
        if (context) {
            const additionalProps = grabDepsFn(context, newProps, injector) || {};
            for (let key in additionalProps) {
                newProps[key] = additionalProps[key];
            }
        }
        if (forwardRef) {
            newProps.ref = forwardRef;
        }
        if (!_isStateless) {
            return createElement(componentClass, newProps);
        }
        return componentClass(newProps);
    }));

    Injector.WrappedComponent = WrappedComponent;
    Injector.isSnowballInjector = true;

    return Injector;
}

function compose(grabDepsFns) {
    return function (dependencies, nextProps, injector) {
        setCurrentCtx(dependencies.ctx);
        const newProps = {};
        doWire(dependencies, () => {
            grabDepsFns.forEach(function (grabDepsFn, i) {
                const processerName = 'PROCESSER_' + i;
                let additionalProps = !injector[processerName]
                    ? grabDepsFn(dependencies, nextProps)
                    : injector[processerName](nextProps);

                if (typeof additionalProps === 'function') {
                    injector[processerName] = additionalProps;
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

    doWire(dependencies, () => {
        nextProps[mapName] = depName in dependencies
            ? dependencies[depName]
            : autowired(depName);
    });
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
 * inject((props) => {
 *  const userService = autowired<IUserService>('userService');
 *  return {
 *   depName1: userService.name
 *  }
 * })(componentClass)
 *
 * inject(['foo', 'bar'], ([foo, bar], props) => ({
 *  barName: bar.name
 *  fooName: foo.name
 * }))(componentClass)
 */
export function inject(deps, injection) {
    let grabDepsFn;

    if (typeof deps === "function") {
        grabDepsFn = compose([].slice.call(arguments));
    } else if (isString(deps)) {
        grabDepsFn = grabDepsByName([].slice.call(arguments));
    } else if (isArray(deps)) {
        if (typeof injection !== 'function') {
            throw new Error('injection must be function!!');
        }
        grabDepsFn = (dependencies, nextProps, injector) => {
            const depProps = Object.assign({}, nextProps);
            deps.forEach(function (depName, i) {
                mapDepsToProps(dependencies, depProps, injector, depName);
            });
            return injection(deps.map(name => depProps[name]), nextProps);
        };
    } else {
        grabDepsFn = renameProps(deps);
    }

    return (componentClass): Function & { WrappedComponent: any } => createInjector(grabDepsFn, componentClass);
}