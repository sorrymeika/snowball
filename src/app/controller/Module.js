
import { initWithContext, symbolCtx } from "./controller";
import { appCtx } from "../core/createApplication";
import { PageCtx } from "../types";

const symbolEventEmitter = Symbol.for('snowball#EventEmitter');

export default class Module {
    constructor() {
        initWithContext((ctx) => {
            this[symbolCtx] = ctx;
            if (this[symbolEventEmitter]) {
                ctx.page.on('destroy', () => this.off());
            }
        });
    }

    get ctx(): PageCtx {
        return this[symbolCtx];
    }

    get app() {
        return appCtx;
    }
}
