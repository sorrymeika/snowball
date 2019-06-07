import { internal_isControllerCreating, internal_onControllerCreated } from "./controller";
import { observable } from "../../vm";

const AUTO_DISPOSE = Symbol('autoDispose');

export function getAutoDisposedProps(target) {
    const autoDisposedProps = target[AUTO_DISPOSE];
    return autoDisposedProps ? Object.keys(autoDisposedProps) : [];
}

/**
 * 创建订阅器，只能在controller和handler的constructor中创建，否则不能自动解除订阅
 * @param {Function} target 监听函数
 * @example
 * const observer = autoDispose((fn)=>{
 *   document.body.addEventListener('click', fn);
 *   return () => {
 *     document.body.removeEventListener('click', fn);
 *   }
 * })
 */
export default function autoDispose(target, name, descriptor, args) {
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

    const properties = Object.prototype.hasOwnProperty.call(target, AUTO_DISPOSE)
        ? target[AUTO_DISPOSE]
        : (target[AUTO_DISPOSE] = target[AUTO_DISPOSE] ? { ...target[AUTO_DISPOSE] } : {});

    properties[name] = true;

    if (!('value' in descriptor) && !('get' in descriptor) && !('writable' in descriptor) && descriptor.initializer == null) {
        return {
            writable: true,
            configurable: true
        };
    }

    return descriptor;
}
