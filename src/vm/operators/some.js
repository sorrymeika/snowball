
import { Observer, readonlyObserver } from '../Observer';

export default function some(observers) {
    const [observer, setObserver] = readonlyObserver(new Observer());
    let count = 0;
    const states = observers.map((item) => {
        if (item.state.updated) {
            count++;
        }
        return item.get();
    });
    const set = (i, val) => {
        const newStates = [...states];
        newStates.index = i;
        newStates.change = val;
        setObserver(newStates);
    };
    const binders = observers.map((item, i) => {
        const binder = (val) => {
            states[i] = val;
            set(i, val);
        };
        item.observe(binder);
        return binder;
    });
    observer.on('destroy', () => {
        observers.forEach((item, i) => item.unobserve(binders[i]));
    });
    if (count != 0) {
        set(-1, null);
    }
    return observer;
}
