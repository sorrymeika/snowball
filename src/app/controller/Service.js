
import { initWithContext } from "./controller";
import { getApplicationCtx } from "../core/createApplication";

export class Service {
    constructor() {
        if (!this.__is_app_service__) {
            initWithContext((ctx) => {
                this._ctx = ctx;
            });
        }
    }

    get ctx() {
        return this._ctx;
    }

    get app() {
        return getApplicationCtx();
    }
}

Service.prototype['[[ConnectModel]]'] = false;