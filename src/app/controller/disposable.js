import { isFunction } from "../../utils";

export function disposable(target, key, descriptor) {
    target.ctx.page.on('destroy', () => {
        const disposer = target[key];
        if (disposer) {
            if (isFunction(disposer.off)) {
                disposer.off();
            } else if (isFunction(disposer.destroy)) {
                disposer.destroy();
            }
        }
    });
}