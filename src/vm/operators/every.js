
import { Observer, readonlyObserver } from '../Observer';

export default function every(observers) {
    const [observer, setObserver] = readonlyObserver(new Observer());
    const states = [];
    const set = (i, val) => {
        const newStates = [...states];
        newStates.index = i;
        newStates.change = val;
        setObserver(newStates);
    };
    let count = 0;
    const counts = observers.map((item, i) => {
        if (item.state.updated) {
            states[i] = item.get();
            count++;
            return 0;
        } else {
            return 1;
        }
    });
    const binders = observers.map((item, i) => {
        const binder = (val) => {
            states[i] = val;
            if (count === observers.length) {
                set(i, val);
            } else {
                count += counts[i];
                counts[i] = 0;
            }
        };
        item.observe(binder);
        return binder;
    });
    observer.on('destroy', () => {
        observers.forEach((item, i) => item.unobserve(binders[i]));
    });
    if (count === observers.length) {
        set(-1, null);
    }
    return observer;
}