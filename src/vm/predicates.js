export const OBSERVER_TYPE_KEY = '%_ObserverObjectType_%';

export function isObserver(observer) {
    return observer && observer[OBSERVER_TYPE_KEY] === 'Observer';
}

export function isObservable(observer) {
    return !!(observer && observer[OBSERVER_TYPE_KEY]);
}

export function isModel(model) {
    return model && model[OBSERVER_TYPE_KEY] === 'Model';
}

export function isCollection(collection) {
    return collection && collection[OBSERVER_TYPE_KEY] === 'Collection';
}

export function isList(list) {
    return list && list[OBSERVER_TYPE_KEY] === 'List';
}