import { IS_HANDLER } from "./symbols";
import { internal_isControllerCreating, internal_onControllerCreated } from "./controller";
import { internal_subscribeAllMessagesOnInit } from "./onMessage";

let handlerCreating = 0;
export function internal_isHandlerCreating() {
    return handlerCreating !== 0;
}

let handlerCreatedListener;
export function internal_onHandlerCreated(fn) {
    if (!internal_isHandlerCreating()) {
        throw new Error('只能在handler创建时调用!');
    }
    if (!handlerCreatedListener) handlerCreatedListener = [];
    handlerCreatedListener.push(fn);
}

function fireHandlerCreated(instance, context) {
    if (handlerCreatedListener) {
        handlerCreatedListener.forEach((fn) => fn(instance, context));
        handlerCreatedListener = null;
    }
}

export default function handler(Handler) {
    if (Handler.prototype.getContext && !Handler.prototype[IS_HANDLER]) {
        throw new Error('不可重写hander的getContext方法');
    }
    Handler.prototype[IS_HANDLER] = true;
    Handler.prototype.getContext = function () {
        return this.__context;
    };
    Handler.prototype.getController = function () {
        return this.__controller;
    };

    class Wrapper extends Handler {
        constructor(...args) {
            if (!internal_isControllerCreating()) {
                throw new Error('必须在controller内或者withHandler内实例化Handler！');
            }
            handlerCreating++;
            super(...args);
            internal_onControllerCreated((controller, page) => {
                this.__context = page;
                this.__controller = controller;
                internal_subscribeAllMessagesOnInit(this);
                this.initialize && this.initialize(...args);

                fireHandlerCreated(this, page);
            });
            handlerCreating--;
        }
    }
    Wrapper.WrappedHandler = Handler;
    return Wrapper;
}

handler.createFactory = (Handler) => {
    if (!Handler.WrappedHandler) {
        throw new Error('Handler必须使用`@handler`包装！');
    }
    if (!internal_isControllerCreating()) {
        throw new Error('必须在controller内创建Handler工厂！');
    }
    const factory = function (props, options) {
        if (!factory.__controller) {
            return new Handler(props, options);
        }
        handlerCreating++;
        const instance = new Handler.WrappedHandler(props, options);
        instance.__context = factory.__context;
        instance.__controller = factory.__controller;
        fireHandlerCreated(instance, factory.__context);
        handlerCreating--;
        return instance;
    };
    internal_onControllerCreated((controller, page) => {
        factory.__context = page;
        factory.__controller = controller;
    });
};
