import { sdk } from "./sdk";
import { Event, EventEmitter } from '../../core/event';

const userEventEmitter = new EventEmitter();

export function addOnBeforeLoginListener(fn) {
    userEventEmitter.on('beforeLogin', fn);
}

export function removeOnBeforeLoginListener(fn) {
    userEventEmitter.off('beforeLogin', fn);
}

/**
 * 通用登录
 */
var waitingForLogin;
export function login(url) {
    var beforeLoginEvent = new Event('beforeLogin');
    userEventEmitter.trigger(beforeLoginEvent);
    if (beforeLoginEvent.isDefaultPrevented() || beforeLoginEvent.isPropagationStopped()) {
        return;
    }
    if (waitingForLogin) return waitingForLogin;

    waitingForLogin = new Promise((resolve, reject) => {
        sdk.execute('login', url, resolve, reject);
    })
        .then(() => {
            waitingForLogin = null;
        });

    return waitingForLogin;
}
