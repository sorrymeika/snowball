export const TYPEOF = '[[ObservableObjectType]]';

export function isObserver(observer) {
    return observer && observer[TYPEOF] === 'Observer';
}

export function isObservable(observer) {
    return !!(observer && observer[TYPEOF]);
}

export function isModel(model) {
    return model && (model[TYPEOF] === 'Model' || model[TYPEOF] === 'ViewModel');
}

export function isViewModel(model) {
    return model && model[TYPEOF] === 'ViewModel';
}

export function isCollection(collection) {
    return collection && collection[TYPEOF] === 'Collection';
}

export function isList(list) {
    return list && list[TYPEOF] === 'List';
}