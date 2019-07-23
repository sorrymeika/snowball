
import { initWithContext } from "./controller";
import { internal_subscribeAllMessagesOnInit } from "./onMessage";

export class Service {
    constructor() {
        initWithContext((ctx) => {
            this._ctx = ctx;
            internal_subscribeAllMessagesOnInit(this);
        });
    }

    get ctx() {
        return this._ctx;
    }
}

Service.prototype['[[ConnectModel]]'] = false;