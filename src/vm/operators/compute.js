import { Observer, readonlyObserver, Subject } from "../objects/Observer";

/**
 * 计算方法
 * @param {any[]|Function} source 来源的Observer列表
 * @param {Function} calc 计算方法
 * @param {any} [initalValue] 初始值
 */
export default function compute(source, calc, initalValue) {
    if (typeof source === 'function' && typeof calc === 'function') {
        const [computed, setObserver] = readonlyObserver(new Subject(calc(initalValue)));
        const set = function (val) {
            setObserver(calc(val));
        };
        const dispose = source(set);
        computed.on('destroy', dispose);
        return computed;
    }

    const [observer, setObserver] = readonlyObserver(new Observer(initalValue));
    const getArgs = () => source.map((item) => item.get());

    let olds = getArgs();
    const compute = () => {
        const args = getArgs();
        setObserver(calc(args, olds, observer.get()));
        olds = args;
    };
    source.forEach((item) => item.observe(compute));
    observer.on('destroy', () =>
        source.forEach((item) =>
            item.unobserve(compute)
        )
    );
    compute();
    return observer;
}