import { SymbolRelObserver } from '../symbols';

export function getRelObserver(obj) {
    return obj && obj['[[ConnectModel]]'] !== false && obj[SymbolRelObserver];
}

export function getRelObserverOrSelf(obj) {
    return getRelObserver(obj) || obj;
}