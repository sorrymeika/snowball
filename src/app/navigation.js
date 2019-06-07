import { internal_getApplication } from "./lib/createApplication";

const getNavigation = () => {
    const application = internal_getApplication();
    if (!application) throw new Error('应用还未实例化');
    return application.navigation;
};

export const forward = (url, props) => {
    getNavigation().forward(url, props);
};

export const back = (url, props?, withAnimation = true) => {
    getNavigation().back(url, props, withAnimation);
};

export const replace = (url) => {
    getNavigation().replace(url);
};

export const transitionTo = (url, navigateType, props, withAnimation) => {
    getNavigation().transitionTo(url, navigateType, props, withAnimation);
};

export const home = () => {
    getNavigation().home();
};