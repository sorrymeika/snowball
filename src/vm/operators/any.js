import { Observer, readonlyObserver } from '../objects/Observer';

export default function any(observers) {
    const [observer, set] = readonlyObserver(new Observer());
    observers.forEach((item) => {
        item.observe(set);
    });
    observer.on('destroy', () => {
        observers.forEach((item) => item.unobserve(set));
    });
    return observer;
}