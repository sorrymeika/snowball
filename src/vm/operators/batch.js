import { readonlyObserver } from "../objects/Observer";
import State from "../objects/State";

/**
 * 监听多个Observer并处理
 * @param {any[]|Function} observers Observer列表
 * @param {Function} calc 计算方法
 * @param {any} [initalValue] 初始值
 */
export default function batch(observers, calc, initialValue) {
    const [observer, next] = readonlyObserver(new State());
    const getArgs = () => observers.map((item) => item.get());

    let state = initialValue;
    let oldVals = getArgs();
    const compute = () => {
        const currentVals = getArgs();
        state = calc(state, currentVals, oldVals, next);
        oldVals = currentVals;
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