
import { initWithContext } from "./controller";
import { symbolCtx } from "./symbols";
import { appCtx } from "../core/createApplication";
import { PageCtx } from "../types";

export default class Module {
    constructor() {
        initWithContext((ctx) => {
            this[symbolCtx] = ctx;
        });
    }

    get ctx(): PageCtx {
        return this[symbolCtx];
    }

    get app() {
        return appCtx;
    }
}
