import { isString } from "../../utils";

function decorate(target, key, { value: fn, configurable, enumerable, initializer }, type) {
    if ((fn !== undefined && typeof fn !== 'function') || initializer) {
        throw new SyntaxError(`@emitter can only be used on functions!`);
    }

    return {
        configurable: true,
        enumerable,

        get() {
            if (this === target) {
                return fn;
            }

            const boundFn = fn ? fn.bind(this) : undefined;
            const emitterFn = this.ctx[type === 'async' ? 'createAsyncEmitter' : 'createEmitter'](boundFn);

            Object.defineProperty(this, key, {
                configurable: true,
                writable: true,
                enumerable: true,
                value: emitterFn
            });

            return emitterFn;
        }
    };
}

function createEmitterDecorator(type) {
    return (target, key, descriptor) => {
        return isString(target)
            ? (_target, _key, _descriptor) => {
                Object.defineProperty(_target, target, decorate(_target, target, _descriptor, type));
                return _descriptor;
            }
            : decorate(target, key, descriptor, type);
    };
}

export const emitter = createEmitterDecorator();
export const asyncEmitter = createEmitterDecorator("async");
emitter.async = asyncEmitter;