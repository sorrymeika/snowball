import { get } from "../../utils";
import { PropObserver } from "../objects/Observer";

export function handlePropChange(observer, e, data, onChange, oldData) {
    const propChanges = observer.state.propChanges || (observer.state.propChanges = {});
    const propName = getPropName(e.type);
    if (propChanges[propName] !== data) {
        propChanges[propName] = data;
        onChange.call(observer, data, oldData);
    }
}

function getPropName(eventType) {
    return eventType.replace(/^(change|datachanged):/, '').replace(/[/]/g, '.');
}

export function observeProp(observer, name, fn) {
    if (!fn) {
        return new PropObserver(observer, name);
    } else {
        const cb = (e) => {
            const propName = getPropName(e.type);
            handlePropChange(observer, e, get(observer.state.data, propName), fn);
            delete observer.state.propChanges[propName];
        };
        cb._cb = fn;
        observer.on(castEvents(name), cb);
        return () => observer.unobserve(name, fn);
    }
}

export function unobserveProp(observer, name, fn) {
    return observer.off(castEvents(name), fn);
}

function castEvents(propNames) {
    return 'datachanged' + (
        propNames
            ? propNames
                .split(/\s+/)
                .filter(name => !!name)
                .map(name => ':' + name.replace(/\./g, '/'))
                .join(' datachanged')
            : ''
    );
}