import { injectable } from "./injectable";

export function ref(target, name, descriptor) {
    injectable(target, name, descriptor);

    return {
        get() {
            const newKey = '@' + name + '@';
            if (!target[newKey]) {
                const elementRef = (current) => {
                    elementRef.current = current;
                };
                target[newKey] = elementRef;
                return elementRef;
            }
            return target[newKey];
        }
    };
}