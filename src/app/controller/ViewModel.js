
import Module from "./Module";

export class ViewModel extends Module {
    constructor() {
        super();

        const { page } = this.ctx;
        const { status } = page;

        if (status != 4) {
            this.onInit && (
                status > 0
                    ? this.onInit()
                    : page.on('init', () => this.onInit())
            );
            this.onCreate && (
                status > 1
                    ? this.onCreate()
                    : page.on('create', () => this.onInit())
            );
            this.onDestroy && page.on('destroy', () => this.onDestroy());
        }
    }
}
