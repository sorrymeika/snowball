import { Observer, readonlyObserver } from "../Observer";

export default function compute(initalValue, observers, calc) {
    if (typeof observers === 'function' && typeof calc === 'function') {
        const [result, setObserver] = readonlyObserver(new Observer(calc(initalValue)));
        const set = function (val) {
            setObserver(calc(val));
        };
        const dispose = observers(set);
        result.on('destroy', dispose);
        return result;
    }
    if (!Array.isArray(observers)) {
        [observers, calc, initalValue] = [initalValue, observers];
    }
    const [observer, setObserver] = readonlyObserver(new Observer(initalValue));
    const getArgs = () => observers.map((item) => item.get());

    let olds = getArgs();
    const compute = () => {
        const args = getArgs();
        setObserver(calc(args, olds, observer.get()));
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