
function createEmitterDecorator(type) {
    return (target, key, { value: fn, configurable, enumerable, initializer }) => {
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
                const emitterFn = this.ctx[type === 'asyncEmitter' ? 'createAsyncEmitter' : 'createEmitter'](boundFn);

                Object.defineProperty(this, key, {
                    configurable: true,
                    writable: true,
                    enumerable,
                    value: emitterFn
                });

                return emitterFn;
            }
        };
    };
}

export const emitter = createEmitterDecorator('emitter');
export const asyncEmitter = createEmitterDecorator("asyncEmitter");