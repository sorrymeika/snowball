import { readonlyObserver } from "../Observer";
import State from "../State";

export default function batch(observers, calc, initialValue) {
    const [observer, next] = readonlyObserver(new State());
    const getArgs = () => observers.map((item) => item.get());

    let state = initialValue;
    let olds = getArgs();
    const compute = () => {
        const args = getArgs();
        state = calc(args, olds, state, next);
        olds = args;
    };
    observers.forEach((item) => item.observe(compute));
    observer.on('destroy', () =>
        observers.forEach((item) =>
            item.unobserve(compute)
        )
    );
    compute();
    return observer;
}