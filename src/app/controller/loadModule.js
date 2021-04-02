import { autowired, withAutowiredScope, getCurrentCaller } from "../core/autowired";
import { appCtx } from "../core/createApplication";
import { buildConfiguration } from "../core/configuration";
import { mapOnce, sealObject } from "../../utils";
import { ViewModel } from "./ViewModel";

const excludeProps = ['ctx', 'app', 'constructor'];
const excludeViewModelProps = [...excludeProps, 'onResume', 'onPause', 'onInit', 'onCreate', 'onDestroy'];

let Configuration;
let autowiredCache;
let autowiredCount = 0;

export function loadModule(moduleName, options) {
    return getModule(getCurrentCaller(), moduleName, options);
}

export function flatModule(moduleName, options) {
    return (caller) => {
        const modul = getModule(caller, moduleName, options);
        return modul instanceof ViewModel
            ? sealViewModel(modul)
            : sealModule(modul);
    };
}

function sealModule(viewModel) {
    return mapOnce(viewModel, () => sealObject(viewModel, excludeProps));
}

function sealViewModel(viewModel) {
    return mapOnce(viewModel, () => sealObject(viewModel, excludeViewModelProps));
}

function getModule(caller, moduleName, options) {
    const instance = (caller && caller[moduleName]) || autowired(moduleName, options) || withAutowiredScope(autowiredCache || (autowiredCache = {
        ctx: {
            Configuration: Configuration || (Configuration = buildConfiguration(appCtx._configuration))
        },
        app: appCtx
    }), () => autowired(moduleName, options));

    autowiredCount++;
    Promise.resolve().then(() => {
        autowiredCount--;
        if (autowiredCount == 0) {
            autowiredCache = null;
        }
    });
    return instance;
}