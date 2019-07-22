
import { internal_isControllerCreating, internal_onControllerCreated } from "./controller";
import { internal_subscribeAllMessagesOnInit } from "./onMessage";
import { currentContext } from "./inject";

export class Service {
    constructor() {
        if (internal_isControllerCreating()) {
            internal_onControllerCreated((controller, page) => {
                this._ctx = page;
                internal_subscribeAllMessagesOnInit(this);
            });
        } else {
            this._ctx = currentContext();
            internal_subscribeAllMessagesOnInit(this);
        }
    }

    get ctx() {
        return this._ctx;
    }
}

Service.prototype['[[ConnectModel]]'] = false;