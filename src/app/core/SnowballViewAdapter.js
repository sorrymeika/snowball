import { IViewAdapter } from "../types";

export default class SnowballViewAdapter implements IViewAdapter {

    constructor({ el, page, activity, viewFactory, mapStoreToProps }) {
        const ViewClass = viewFactory;

        this.model = new ViewClass({
            app: page.ctx.app,
            ctx: page.ctx,
        });
        this.activity = activity;
        this.isReady = false;
        this.readyActions = [];
        this.mapStoreToProps = mapStoreToProps;
    }

    ready(fn) {
        if (this.isReady) {
            fn();
        } else {
            this.readyActions.push(fn);
        }
    }

    update(attributes, cb) {
        this.model.set(attributes);

        if (!this.isSetup) {
            this.isSetup = true;
            if (this.mapStoreToProps) {
                const data = this.mapStoreToProps(this.model.attributes, this.page);
                if (typeof data === 'function') {
                    data((newData) => {
                        this.model.set(newData);
                    });
                } else {
                    this.model.set(data);
                }
                this.mapStoreToProps = null;
            }
            this.model.$el.appendTo(this.el);
            this.model.nextTick(() => {
                this.isReady = true;
                this.readyActions.forEach((fn) => {
                    fn();
                });
                this.readyActions = null;
            });
        }
        cb && this.model.nextTick(cb);
    }

    destroy() {
        this.model.destroy();
    }
}