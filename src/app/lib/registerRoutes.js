import { internal_getApplication, internal_beforeStartApplication } from "./createApplication";

export function registerRoutes(routes) {
    const application = internal_getApplication();
    const routeManager = application.routeManager;
    if (!application) {
        internal_beforeStartApplication(() => {
            routeManager.registerRoutes(routes);
        });
    } else {
        routeManager.registerRoutes(routes);
    }
}