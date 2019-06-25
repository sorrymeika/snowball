
import { internal_isControllerCreating, internal_onControllerCreated } from "./controller";
import { internal_subscribeAllMessagesOnInit } from "./onMessage";
import { currentContext } from "./inject";

export class Service {
    constructor() {
        if (internal_isControllerCreating()) {
            internal_onControllerCreated((controller, page) => {
                this.__context = page;
                internal_subscribeAllMessagesOnInit(this);
            });
        } else {
            this.__context = currentContext.get();
            internal_subscribeAllMessagesOnInit(this);
        }
    }

    get context() {
        return this.__context;
    }
}