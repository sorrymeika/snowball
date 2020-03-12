import { readonlyObserver, Observer } from "../objects/Observer";

/**
 * 计算方法
 * @param {any[]|Function} source 来源的Observer列表
 * @param {Function} calc 计算方法
 * @param {any} [initalValue] 初始值
 */
export default function compute(source, calc, initalValue) {
    const [observer, setObserver] = readonlyObserver(new Observer(initalValue));
    const getArgs = () => source.map((item) => item.get());

    let olds = getArgs();
    const change = () => {
        const args = getArgs();
        setObserver(calc(args, olds, observer.get()));
        olds = args;
    };
    source.forEach((item) => item.observe(change));
    observer.on('destroy', () =>
        source.forEach((item) =>
            item.unobserve(change)
        )
    );
    change();
    return observer;
}