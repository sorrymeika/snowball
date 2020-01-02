
import { initWithContext } from "./controller";
import { getApplicationCtx } from "../core/createApplication";
import { PageCtx } from "../types";
import { Model } from "../../vm";

export class Service {
    constructor() {
        if (!this.__is_app_service__) {
            initWithContext((ctx) => {
                this._ctx = ctx;
            });
        }
    }

    get ctx(): PageCtx {
        return this._ctx;
    }

    get app() {
        return getApplicationCtx();
    }
}

Model.neverConnectToModel(Service.prototype);