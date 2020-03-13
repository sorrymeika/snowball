import { get } from "../../utils";
import { PropObserver } from "../objects/Observer";

export function observeProp(observer, name, fn) {
    if (!fn) {
        return new PropObserver(observer, name);
    } else {
        const cb = (e) => fn.call(observer, get(observer.state.data, e.type.replace(/^datachanged:/, '').replace(/[/]/g, '.')));
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