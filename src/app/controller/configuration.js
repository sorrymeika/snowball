import { mixin } from "../../utils";

function conf(Configuration, dependencies) {
    Configuration.dependencies = dependencies;
    return Configuration;
}

export function buildConfiguration(configurations) {
    const result = new Set();
    buildConf(configurations, result);
    return mixin(...result);
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

export function configuration(dependencies) {
    return Array.isArray(dependencies)
        ? (Configuration) => conf(Configuration, dependencies)
        : conf(dependencies);
}