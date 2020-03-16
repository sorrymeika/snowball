import { _getApplication, appCtx } from "./createApplication";

export function registerRoutes(routes) {
    const application = _getApplication();
    if (!application) {
        appCtx
            .once('beforestart', () => {
                _getApplication().registerRoutes(routes);
            });
    } else {
        application.registerRoutes(routes);
    }
}