import { internal_isControllerCreating, internal_onControllerCreated } from "./controller";
import { observable } from "../../vm";

const AUTO_DISPOSE = Symbol('DISPOSABLE');

export function getDisposableProps(target) {
    const disposableProps = target[AUTO_DISPOSE];
    return disposableProps ? Object.keys(disposableProps) : [];
}

/**
 * 创建订阅器，只能在controller和handler的constructor中创建，否则不能自动解除订阅
 * @param {Function} target 监听函数
 * @example
 * const observer = disposable((fn)=>{
 *   document.body.addEventListener('click', fn);
 *   return () => {
 *     document.body.removeEventListener('click', fn);
 *   }
 * })
 */
export function disposable(target, name, descriptor, args) {
    if (!name) {
        if (internal_isControllerCreating()) {
            let observer = observable(target);
            internal_onControllerCreated((instance, page) => {
                const dispose = () => {
                    observer.destroy();
                };
                if (page) {
                    page.addOnDestroyListener(dispose);
                } else {
                    internal_onControllerCreated((controller, page) => {
                        page.addOnDestroyListener(dispose);
                    });
                }
            });
            return observer;
        } else {
            throw new Error('只能在controller的constructor中使用autoDispose，否则不能自动解除订阅');
        }
    }

    const disposableProps = Object.prototype.hasOwnProperty.call(target, AUTO_DISPOSE)
        ? target[AUTO_DISPOSE]
        : (target[AUTO_DISPOSE] = target[AUTO_DISPOSE] ? { ...target[AUTO_DISPOSE] } : {});

    disposableProps[name] = true;

    if (!('value' in descriptor) && !('get' in descriptor) && !('writable' in descriptor) && descriptor.initializer == null) {
        return {
            writable: true,
            configurable: true
        };
    }

    return descriptor;
}
