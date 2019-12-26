function conf(Configuration, configurations) {
    let descriptors = {};
    let proto = Configuration.prototype;

    while (1) {
        descriptors = Object.assign(Object.getOwnPropertyDescriptors(proto), descriptors);

        const parent = Object.getPrototypeOf(proto);
        if (parent === proto || parent === Object.prototype) {
            break;
        } else {
            proto = parent;
        }
    }

    descriptors = Object.assign(
        configurations.reduce((result, desc) => Object.assign(result, desc), {}),
        descriptors
    );

    const result = {};
    for (let key in descriptors) {
        if (key !== 'constructor') {
            result[key] = descriptors[key];
        }
    }
    return result;
}

export function configuration(...configurations) {
    return typeof configurations[0] === 'function'
        ? conf(configurations[0], [])
        : (Configuration) => conf(Configuration, configurations);
}