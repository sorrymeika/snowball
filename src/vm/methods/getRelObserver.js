import { SymbolRelObserver } from '../symbols';

const SymbolNeverConnect = Symbol('Model#NeverConnect');

export function neverConnectToModel(obj) {
    obj[SymbolNeverConnect] = true;
    return obj;
}

function isNeverConnectToModel(obj) {
    return !!obj[SymbolNeverConnect];
}

export function getRelObserver(obj) {
    return obj && !isNeverConnectToModel(obj) && obj[SymbolRelObserver];
}

export function getRelObserverOrSelf(obj) {
    return getRelObserver(obj) || obj;
}