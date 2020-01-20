
export function buildConfiguration(configurations) {
    const result = new Set();
    buildConf(configurations, result);

    const modules = {};
    const parameters = {};
    for (let conf of result) {
        Object.assign(modules, conf.modules);
        Object.assign(parameters, conf.parameters);
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
                    return ClassType.call(this._caller, this.ctx, this.app);
                }
            }
        });
    }

    const params = proto.__params__ = {};
    for (let name in parameters) {
        const paramType = parameters[name];
        Object.defineProperty(params, name, {
            get() {
                const { __configuration__ } = this;
                return paramType.call(__configuration__._caller, __configuration__.ctx, __configuration__.app);
            }
        });
    }

    function Configuration(ctx, app) {
        this.ctx = ctx;
        this.app = app;
        this.__params__.__configuration__ = this;
    }
    Configuration.prototype = proto;
    return Configuration;
}

function buildConf(configurations, result) {
    for (let i = 0; i < configurations.length; i++) {
        const conf = configurations[i];
        if (conf.dependencies && conf.dependencies.length) {
            buildConf(conf.dependencies, result);
        }
        result.add(conf);
    }
}

class Configuration {
    constructor({ dependencies, modules, parameters }) {
        this.dependencies = dependencies ? [].concat(dependencies) : [];
        this.modules = modules;
        this.parameters = parameters || {};
    }
}

export function configuration({ dependencies, modules, parameters }) {
    return new Configuration({ dependencies, modules, parameters });
}