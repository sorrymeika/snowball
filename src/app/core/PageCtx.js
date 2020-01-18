import { observable, autorun } from '../../vm';
import { EventEmitter, createAsyncEmitter, createEmitter, EventDelegate } from '../../core/event';
import { buildConfiguration } from '../controller/configuration';

export default class PageCtx extends EventEmitter {
    constructor(page, app, configs) {
        super();

        this.Configuration = buildConfiguration(app._configuration.concat(configs));

        this.page = page;
        this.app = app;
    }

    get navigation() {
        return this.app.navigation;
    }

    get location() {
        return this.page.location;
    }

    delegate(eventEmitter, type, listener) {
        const delegate = new EventDelegate(eventEmitter, type, listener);
        this.page.on('destroy', delegate.off);
        return delegate;
    }

    createEmitter(init) {
        const event = createEmitter(init);
        this.page.on('destroy', event.off);
        return event;
    }

    createAsyncEmitter(init) {
        const event = createAsyncEmitter(init);
        this.page.on('destroy', event.off);
        return event;
    }

    autorun(fn) {
        const dispose = autorun(fn);
        this.page.on('destroy', dispose);
        return dispose;
    }

    useObservable(value) {
        const observer = observable(value);
        this.page.on('destroy', () => observer.destroy());
        return observer;
    }

    autoDispose(fn) {
        this.page.on('destroy', fn);
        return fn;
    }
}