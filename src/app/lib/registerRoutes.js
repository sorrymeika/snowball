import { internal_getApplication, internal_beforeStartApplication } from "./createApplication";

export function registerRoutes(routes) {
    const application = internal_getApplication();
    if (!application) {
        internal_beforeStartApplication((application) => {
            application.registerRoutes(routes);
        });
    } else {
        application.registerRoutes(routes);
    }
}