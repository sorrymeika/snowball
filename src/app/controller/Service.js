
import { initWithContext } from "./controller";
import { getApplicationCtx } from "../core/createApplication";

export class Service {
    constructor() {
        initWithContext((ctx) => {
            this._ctx = ctx;
        });
    }

    get ctx() {
        return this._ctx || getApplicationCtx();
    }
}

Service.prototype['[[ConnectModel]]'] = false;