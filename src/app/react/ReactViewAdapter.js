
import React, { Component, createElement } from 'react';
import ReactDOM from 'react-dom';
import { IViewAdapter } from "../types";
import { Model } from '../../vm';
import { SymbolFrom } from '../../vm/symbols';
import { PageContext, makeComponentReacitve } from './inject';

export default class ReactViewAdapter implements IViewAdapter {
    constructor({ el, page, activity, viewFactory, mapStoreToProps }) {
        this.el = el;
        this.page = page;
        this.activity = activity;
        this.model = new Model({
            app: page.ctx.app,
            ctx: page.ctx,
            location: activity.location
        });
        this.state = {};
        this._defineProps(['app', 'ctx']);
        this.isReady = false;
        this.readyActions = [];
        this.mapStoreToProps = mapStoreToProps;

        const viewHandler = this;
        const reactiveView = viewFactory.$$isInjector === true ? viewFactory : makeComponentReacitve(viewFactory);

        class PageProvider extends Component {
            constructor() {
                super();

                if (page.react && page.react.Provider) {
                    const render = this.render;
                    this.render = () => {
                        return React.createElement(page.react.Provider, null, render.call(this));
                    };
                }
                this.isRenderingPending = false;
            }

            shouldComponentUpdate() {
                if (viewHandler.activity.transitionTask) {
                    if (!this.isRenderingPending) {
                        this.isRenderingPending = true;
                        viewHandler.activity.transitionTask.then(() => {
                            this.forceUpdate();
                        });
                    }
                    return false;
                }
                return true;
            }

            render() {
                this.isRenderingPending = false;
                return (
                    <PageContext.Provider
                        value={viewHandler.state}
                    >{createElement(reactiveView, viewHandler.model.attributes)}</PageContext.Provider>
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
            if (this.activity.transitionTask) {
                this.componentInstance.setState(() => ({
                    data
                }));
                cb && cb();
            } else {
                this.componentInstance.setState({
                    data
                }, cb);
            }
        } else {
            cb && cb();
        }
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
            timer = `render ${this.activity.location.path} spend`;
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