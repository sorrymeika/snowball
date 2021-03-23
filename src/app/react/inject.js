/* eslint-disable react-hooks/rules-of-hooks */
import React, { createElement, useState, useRef, useEffect, useContext } from 'react';
import { isString, isArray, isFunction } from '../../utils';
import { Reaction } from '../../vm';
import { observer } from './observer';
import { _getApplication } from '../core/createApplication';
import { withAutowiredScope, autowired } from '../core/autowired';

export const PageContext = React.createContext();

function isStateless(component) {
    // `function() {}` has prototype, but `() => {}` doesn't
    // `() => {}` via Babel has prototype too.
    return !(component.prototype && component.prototype.render);
}

function makeStatelessComponentReacitve(statelessComponentFn) {
    const componentFn = (props, forwardRef) => {
        let [version, setRendering] = useState(0);

        const reactionTrackingRef = useRef(null);

        if (!reactionTrackingRef.current) {
            let ver = version;
            reactionTrackingRef.current = new Reaction(() => {
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
        }

        const reaction = reactionTrackingRef.current;
        reaction.isRenderingPending = false;

        useEffect(() => () => reaction.destroy(), [reaction]);

        let element;
        reaction.track(() => {
            element = statelessComponentFn(props, forwardRef);
        });
        return element;
    };
    return componentFn;
}

function defaultMergeProps(additionalProps, ownProps) {
    return Object.assign({}, ownProps, additionalProps);
}

function createInjector(mapDependenciesToProps, mergeProps = defaultMergeProps, componentClass) {
    const _isStateless = isStateless(componentClass);
    const WrappedComponent = componentClass;

    if (!_isStateless) {
        componentClass = observer(componentClass);
    }

    const Injector = React.memo(React.forwardRef(makeStatelessComponentReacitve((ownProps, forwardRef) => {
        const context = useContext(PageContext);
        const injector = useRef({});

        const additionalProps = mapDependenciesToProps(context, ownProps, injector.current);
        const newProps = mergeProps(additionalProps, ownProps);

        if (forwardRef) {
            newProps.ref = forwardRef;
        }
        if (!_isStateless) {
            return createElement(componentClass, newProps);
        }
        return componentClass(newProps);
    })));

    Injector.WrappedComponent = WrappedComponent;
    Injector.isSnowballInjector = true;

    return Injector;
}

function compose(mapDependenciesToPropsFactories) {
    return function (dependencies, ownProps, injector) {
        const newProps = {};
        withAutowiredScope(dependencies, () => {
            mapDependenciesToPropsFactories.forEach(function (mapDependenciesToProps, i) {
                let additionalProps = mapDependenciesToProps(dependencies, ownProps);
                if (additionalProps) {
                    for (let key in additionalProps) {
                        newProps[key] = additionalProps[key];
                    }
                }
            });
        });
        return newProps;
    };
}

function createMapDependenciesToPropsFn(depNames, mapNames) {
    return (dependencies, ownProps, injector) => {
        const injectionProps = {};
        withAutowiredScope(dependencies, () => {
            depNames.forEach((depName, i) => {
                injectionProps[mapNames[i]] = depName in ownProps
                    ? ownProps[depName]
                    : depName in dependencies
                        ? dependencies[depName]
                        : autowired(depName);
            });
        });
        return injectionProps;
    };
}

function mapByNames(depNames) {
    return createMapDependenciesToPropsFn(depNames, depNames);
}

function renameProps(mapper) {
    const keys = [];
    const values = [];

    for (let key in mapper) {
        keys.push(key);
        values.push(mapper[key]);
    }

    return createMapDependenciesToPropsFn(keys, values);
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
export function inject(mapDependenciesToPropsFactories, mergeProps, options) {
    let mapDependenciesToProps;

    if (isFunction(mapDependenciesToPropsFactories) || (isArray(mapDependenciesToPropsFactories) && isFunction(mapDependenciesToPropsFactories[0]))) {
        mapDependenciesToProps = compose([].concat(mapDependenciesToPropsFactories));
    } else if (isString(mapDependenciesToPropsFactories)) {
        mapDependenciesToProps = mapByNames([].slice.call(arguments));
        options = mergeProps = undefined;
    } else if (isArray(mapDependenciesToPropsFactories)) {
        const deps = mapDependenciesToPropsFactories;
        const map = mapByNames(deps);
        mapDependenciesToPropsFactories = mergeProps;
        mergeProps = options;
        mapDependenciesToProps = (dependencies, ownProps, injector) => {
            const newProps = map(dependencies, ownProps, injector);
            return mapDependenciesToPropsFactories(deps.map(name => newProps[name]), ownProps);
        };
    } else {
        mapDependenciesToProps = renameProps(mapDependenciesToPropsFactories);
    }

    return (componentClass): Function & { WrappedComponent: any } => createInjector(mapDependenciesToProps, mergeProps, componentClass);
}