import { PageContext } from "./inject";
import { observer } from "./observer";

const IsReactController = Symbol('IsReactController');

export function reactViewModel(componentClass) {
    if (!componentClass.prototype || !componentClass.prototype.render) {
        throw new Error('could\'t use `reactController` to decorate stateless component!');
    }

    const target = componentClass.prototype;
    if (target[IsReactController]) {
        return componentClass;
    }
    target[IsReactController] = true;

    componentClass.contextType = PageContext;
    Object.defineProperty(target, 'ctx', {
        get() {
            return this.context.ctx;
        }
    });
    Object.defineProperty(target, 'app', {
        get() {
            return this.context.app;
        }
    });

    return observer(componentClass);
}