import { _getApplication, internal_beforeStartApplication } from "./createApplication";

export function registerRoutes(routes) {
    const application = _getApplication();
    if (!application) {
        internal_beforeStartApplication((application) => {
            application.registerRoutes(routes);
        });
    } else {
        application.registerRoutes(routes);
    }
}