import { isString, isFunction } from "../../utils";
import { IS_CONTROLLER, IS_HANDLER, MESSAGE_SUBSCRIBERS } from "./symbols";

export function internal_subscribeAllMessagesOnInit(instance) {
    const eventSubscribers = instance[MESSAGE_SUBSCRIBERS];
    if (eventSubscribers) {
        const context = instance.getContext();
        for (var i = 0; i < eventSubscribers.length; i++) {
            const [type, name] = eventSubscribers[i];
            context.messageChannel.on(type, (e, state) => {
                instance[name](state);
            });
        }
    }
}

export default function onMessage(eventType) {
    return (target, name, descriptor, args) => {
        if (process.env.NODE_ENV === 'development') {
            if (!isString(name)) {
                throw new Error('@onMessage只能作为装饰器使用！');
            }
            if (!descriptor.value || !isFunction(descriptor.value)) {
                throw new Error('@onMessage只能装饰function，且不支持箭头函数!');
            }
            setTimeout(() => {
                if (!(target[IS_CONTROLLER] || target[IS_HANDLER])) {
                    throw new Error('只能在controller、handle中使用@onMessage!');
                }
            }, 0);
        }

        const eventSubscribers = Object.prototype.hasOwnProperty.call(target, MESSAGE_SUBSCRIBERS)
            ? target[MESSAGE_SUBSCRIBERS]
            : (target[MESSAGE_SUBSCRIBERS] = target[MESSAGE_SUBSCRIBERS] ? [...target[MESSAGE_SUBSCRIBERS]] : []);

        if (!eventSubscribers.findIndex(([existsType, existsName]) => existsType == eventType && existsName == name) != -1) {
            eventSubscribers.push([eventType, name]);
        }
        return descriptor;
    };
}
