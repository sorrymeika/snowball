
import Module from "./Module";

export class ViewModel extends Module {
    constructor() {
        super();

        const { page } = this.ctx;
        const { status } = page;

        if (status != 4) {
            const init = () => {
                this.onInit && this.onInit();
                this.onResume && page.on('resume', () => this.onResume());
                this.onPause && page.on('pause', () => this.onPause());
            };
            status > 0
                ? init()
                : page.on('init', init);
            this.onCreate && (
                status > 1
                    ? this.onCreate()
                    : page.on('create', () => this.onCreate())
            );
            this.onDestroy && page.on('destroy', () => this.onDestroy());
        }
    }
}
