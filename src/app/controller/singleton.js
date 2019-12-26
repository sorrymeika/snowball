export function singleton(propto, name, descriptor) {
    if (!descriptor.get) {
        throw new Error('in singleton mode `descriptor` must has `get`!');
    }

    let value;
    return {
        get() {
            if (value === undefined) {
                value = descriptor.get.call(this);
            }
            return value;
        }
    };
}
