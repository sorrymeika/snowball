import { observable, autorun, compute } from '../../vm';
import { EventEmitter, Emitter } from '../../core/event';
import { buildConfiguration } from './configuration';
import { withAutowiredScope, autowired } from './autowired';

export default class PageCtx extends EventEmitter {
    constructor(page, app, configs) {
        super();

        this.Configuration = buildConfiguration(app._configuration.concat(configs || []));

        this.page = page;
        this.app = app;
    }

    get navigation() {
        return this.app.navigation;
    }

    get location() {
        return this.page.location;
    }

    autowired(...args) {
        return withAutowiredScope(this.page, () => autowired(...args));
    }

    createEventEmitter() {
        const eventEmitter = new EventEmitter();
        this.page.on('destroy', () => eventEmitter.off());
        return eventEmitter;
    }

    createEmitter(init) {
        const event = Emitter.create(init);
        this.page.on('destroy', event.off);
        return event;
    }

    createAsyncEmitter(init) {
        const event = Emitter.async(init);
        this.page.on('destroy', event.off);
        return event;
    }

    delegate(eventEmitter, type, listener) {
        const delegate = Emitter.delegate(eventEmitter, type, listener);
        this.page.on('destroy', delegate.off);
        return delegate;
    }

    autorun(fn) {
        const dispose = autorun(fn);
        this.page.on('destroy', dispose);
        return dispose;
    }

    compute(fn) {
        const observer = compute(fn);
        this.page.on('destroy', () => observer.destroy());
        return observer;
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