
export function buildConfiguration(configurations) {
    const result = new Set();
    buildConf(configurations, result);

    const modules = {};
    for (let conf of result) {
        Object.assign(modules, conf.modules);
    }

    const proto = {};
    for (let name in modules) {
        const ClassType = modules[name];
        Object.defineProperty(proto, name, {
            configurable: true,
            get() {
                if (ClassType.prototype) {
                    return new ClassType(this.ctx, this.app);
                } else {
                    // eslint-disable-next-line new-cap
                    return ClassType(this.ctx, this.app);
                }
            }
        });
    }

    function Configuration(ctx, app) {
        this.ctx = ctx;
        this.app = app;
    }
    Configuration.prototype = proto;
    return Configuration;
}

function buildConf(configurations, result) {
    for (let i = 0; i < configurations.length; i++) {
        const conf = configurations[i];
        if (conf.imports && conf.imports.length) {
            buildConf(conf.imports, result);
        }
        result.add(conf);
    }
}

class Configuration {
    constructor({ imports, modules }) {
        this.imports = imports ? [].concat(imports) : [];
        this.modules = modules;
    }
}

export function configuration({ imports, modules }) {
    return new Configuration({ imports, modules });
}