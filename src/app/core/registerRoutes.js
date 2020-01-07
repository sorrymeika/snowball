import { _getApplication, getApplicationCtx } from "./createApplication";

export function registerRoutes(routes) {
    const application = _getApplication();
    if (!application) {
        getApplicationCtx()
            .once('beforestart', () => {
                _getApplication().registerRoutes(routes);
            });
    } else {
        application.registerRoutes(routes);
    }
}