import { SymbolRelObserver } from '../symbols';

const symbolAsNormalObject = Symbol.for('snowball/Observer#asNormalObject');

function canConnectToModel(obj) {
    return !obj[symbolAsNormalObject];
}

export function getRelObserver(obj) {
    return obj && canConnectToModel(obj) && obj[SymbolRelObserver];
}

export function getRelObserverOrSelf(obj) {
    return getRelObserver(obj) || obj;
}