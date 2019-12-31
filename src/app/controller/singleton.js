/* eslint-disable new-cap */
export function singleton(ClassType) {
    let instance;
    return function Singleton(...args) {
        if (instance) {
            return instance;
        }
        return instance = ClassType.prototype
            ? new ClassType(...args)
            : ClassType(...args);
    };
}
