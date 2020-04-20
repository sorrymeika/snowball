import { readonlyObserver, Observer } from "./objects/Observer";
import { autorun } from "./reaction";

/**
 * 计算方法
 * @param {any[]|Function} source 来源的Observer列表
 * @param {Function} calc 计算方法
 */
export function compute(source, calc) {
    if (typeof source === 'function') {
        return autoCompute(source);
    }
    const getArgs = () => source.map((item) => item.get());
    let olds = getArgs();
    const [observer, setObserver] = readonlyObserver(new Observer(calc(olds, olds)));
    const run = () => {
        const args = getArgs();
        setObserver(calc(args, olds, observer.get()));
        olds = args;
    };
    source.forEach((item) => item.observe(run));
    observer.on('destroy', () =>
        source.forEach((item) =>
            item.unobserve(run)
        )
    );
    return observer;
}

function autoCompute(calc) {
    let observer;
    let run = () => {
        const observerAndSet = readonlyObserver(new Observer(calc()));
        const set = observerAndSet[1];
        observer = observerAndSet[0];
        run = () => {
            set(calc());
        };
    };
    const dispose = autorun(() => {
        run();
    });
    return observer.on('destroy', dispose);
}