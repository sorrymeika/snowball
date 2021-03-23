import { observable, autorun, compute } from '../../vm';
import { EventEmitter } from '../../core/event';
import { buildConfiguration } from './configuration';

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

    createEventEmitter() {
        const eventEmitter = new EventEmitter();
        this.page.on('destroy', () => eventEmitter.off());
        return eventEmitter;
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