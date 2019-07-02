import { Observer, readonlyObserver, Emitter } from "../Observer";

export default function compute(initalValue, observers, calc) {
    if (typeof observers === 'function' && typeof calc === 'function') {
        const [computed, setObserver] = readonlyObserver(new Emitter(calc(initalValue)));
        const set = function (val) {
            setObserver(calc(val));
        };
        const dispose = observers(set);
        computed.on('destroy', dispose);
        return computed;
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