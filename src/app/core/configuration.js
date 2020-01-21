
export function buildConfiguration(configurations) {
    const result = new Set();
    buildConf(configurations, result);

    const modules = {};
    const parameters = {};
    for (let conf of result) {
        Object.assign(modules, conf.modules);
        Object.assign(parameters, conf.parameters);
    }

    const moduleNamesMap = {};
    const proto = {
        __modules__: moduleNamesMap
    };
    for (let name in modules) {
        moduleNamesMap[name.toLowerCase()] = name;

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

    function Configuration(ctx, app) {
        this.ctx = ctx;
        this.app = app;

        const params = {};
        for (let name in parameters) {
            const paramType = parameters[name];
            Object.defineProperty(params, name, {
                get: () => {
                    return paramType.call(this._caller, this.ctx, this.app);
                }
            });
        }
        this.__params__ = params;
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