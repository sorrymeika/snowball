export default class SnowballViewHandler {

    constructor(props) {
        const ViewClass = props.viewFactory;

        this.props = props;
        this.model = new ViewClass({
            page: props.page,
            location: props.location
        });
        this.isReady = false;
        this.readyActions = [];
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
                        this.setState(newData);
                    });
                } else {
                    this.setState(data);
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