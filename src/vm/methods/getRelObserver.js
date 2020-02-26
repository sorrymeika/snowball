import { SymbolRelObserver } from '../symbols';

const SymbolNeverConnect = Symbol('Model#NeverConnect');

export function neverConnectToModel(obj) {
    obj[SymbolNeverConnect] = true;
    return obj;
}

function canConnectToModel(obj) {
    return !obj[SymbolNeverConnect];
}

export function getRelObserver(obj) {
    return obj && canConnectToModel(obj) && obj[SymbolRelObserver];
}

export function getRelObserverOrSelf(obj) {
    return getRelObserver(obj) || obj;
}