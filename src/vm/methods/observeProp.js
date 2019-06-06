import { ChangeObserver } from "../Observer";

export function observeProp(observer, name, fn) {
    if (!fn) {
        return new ChangeObserver(observer, name);
    } else {
        const cb = () => fn.call(observer, observer.get());
        cb._cb = fn;
        return observer.on(castEvents(name), cb);
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