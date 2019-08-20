
import React, { Component, createElement } from 'react';
import ReactDOM from 'react-dom';
import { Model } from '../../vm';
import { SymbolFrom } from '../../vm/symbols';
import { PageProviderContext, makeComponentReacitve } from './inject';

export default class ReactViewHandler {
    constructor({ el, page, activity, location, viewFactory, mapStoreToProps }) {
        this.el = el;
        this.page = page;
        this.activity = activity;
        this.model = new Model({
            ctx: page.ctx,
            location
        });
        this.state = {};
        this._defineProps(['ctx', 'location']);
        this.isReady = false;
        this.readyActions = [];
        this.mapStoreToProps = mapStoreToProps;

        const viewHandler = this;
        const reactiveView = viewFactory.$$isInjector === true ? viewFactory : makeComponentReacitve(viewFactory);

        class PageProvider extends Component {
            shouldComponentUpdate() {
                if (viewHandler.activity.animationTask) {
                    viewHandler.activity.animationTask.then(() => {
                        this.forceUpdate();
                    });
                    return false;
                }
                return true;
            }

            render() {
                return (
                    <PageProviderContext.Provider
                        value={{
                            store: viewHandler.state
                        }}
                    >{createElement(reactiveView, viewHandler.model.attributes)}</PageProviderContext.Provider>
                );
            }
        }
        this.renderPage = PageProvider;
    }

    setState(data, cb) {
        const keys = Object.keys(data);
        this._defineProps(keys);
        this.model.set(keys.reduce((newData, key) => {
            const item = data[key];
            newData[key] = (item && item[SymbolFrom]) || item;
            return newData;
        }, {}));

        if (this.componentInstance) {
            this.syncStateToView(cb);
        } else if (cb) {
            this.ready(cb);
        }
    }

    syncStateToView(cb) {
        const data = this.model.attributes;
        if (data !== this.lastData) {
            this.lastData = data;
            this.componentInstance.setState({
                data
            }, cb);
        } else {
            cb && cb();
        }
    }

    get location() {
        return this.model.attributes.location;
    }

    ready(fn) {
        if (this.isReady) {
            fn();
        } else {
            this.readyActions.push(fn);
        }
    }

    setup(attributes, cb) {
        if (!this.isSetup) {
            this.isSetup = true;
            this.setState(attributes);

            const { model } = this;
            if (this.mapStoreToProps) {
                const data = this.mapStoreToProps(model.attributes, this.page);
                if (typeof data === 'function') {
                    data((newData) => {
                        this.setState(newData);
                    });
                } else {
                    this.setState(data);
                }
                this.mapStoreToProps = null;
            }

            this.render(() => {
                this.isReady = true;
                this.readyActions.forEach((fn) => {
                    fn();
                });
                this.readyActions = null;
                cb && cb();
            });

            this.ready(() => {
                this.model.on('change', () => {
                    this.syncStateToView();
                });
            });
        }
    }

    update(attributes, cb) {
        if (!this.isSetup) {
            this.setup(attributes, cb);
        } else {
            this.setState(attributes, cb);
        }
    }

    /**
     * 渲染当前页面
     * @param {function} [callback] 渲染成功回调函数
     */
    render(callback) {
        var lifecycle = this.activity.lifecycle;
        if (lifecycle.shouldRender && !lifecycle.shouldRender(this.model.attributes)) {
            callback && callback();
            return;
        }

        var timer,
            now;

        if (process.env.NODE_ENV !== 'test') {
            timer = `render ${this.location.path} spend`;
            now = Date.now();
            console.time(timer);
        }

        this.componentInstance = ReactDOM.render(createElement(this.renderPage), this.el, () => {
            callback && callback();
            if (process.env.NODE_ENV !== 'test') {
                console.timeEnd(timer);
                const useTime = Date.now() - now;
                if (useTime >= 50) {
                    console.warn(timer + ": " + useTime + 'ms, it took too long!');
                }
            }
        });
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.el);
        this.model.destroy();
    }

    async _defineProps(names) {
        if (!this._definedProps)
            this._definedProps = {};

        const { model } = this;

        names.forEach((name) => {
            if (!this._definedProps[name]) {
                this._definedProps[name] = true;
                Object.defineProperty(this.state, name, {
                    get() {
                        return model.state.data[name];
                    }
                });
            }
        });
    }
}