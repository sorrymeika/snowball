import Module from "./Module";

/* eslint-disable new-cap */
export function singleton(ClassType) {
    let instance;
    return function Singleton(...args) {
        if (!instance) {
            if (ClassType.prototype) {
                if (ClassType.prototype instanceof Module) {
                    Object.defineProperty(ClassType.prototype, 'ctx', {
                        get() {
                            return this.app.currentCtx;
                        }
                    });
                }
                instance = new ClassType(...args);
            } else {
                instance = ClassType(...args);
            }
        }
        return instance;
    };
}
