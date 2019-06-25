
import React, { createElement } from 'react';
import ReactDOM from 'react-dom';
import { Model } from '../../vm';

const defer = Promise.prototype.then.bind(Promise.resolve());

export const PageProviderContext = React.createContext();

export default class ReactViewHandler {
    constructor({ el, page, activity, stores, location, viewFactory, mapStoreToProps }) {
        this.el = el;
        this.page = page;
        this.activity = activity;
        this.model = new Model({
            $context: page,
            globalStores: stores,
            location
        });
        this.isReady = false;
        this.readyActions = [];
        this.mapStoreToProps = mapStoreToProps;

        const postMessage = (state) => {
            page.postMessage(state);
        };
        this.renderPage = () => {
            return (
                <PageProviderContext.Provider
                    value={{
                        __postMessage: postMessage,
                        store: this.model.attributes
                    }}
                >{createElement(viewFactory, this.model.attributes)}</PageProviderContext.Provider>
            );
        };
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
            const model = this.model.set(attributes);
            if (this.mapStoreToProps) {
                const data = this.mapStoreToProps(model.attributes, this.page);
                if (typeof data === 'function') {
                    data((newData) => {
                        model.set(newData);
                    });
                } else {
                    model.set(data);
                }
                this.mapStoreToProps = null;
            }

            let initalData = model.state.data;
            let renderId = 0;

            this.render(() => {
                this.isReady = true;
                this.readyActions.forEach((fn) => {
                    fn();
                });
                this.readyActions = null;
                cb && cb();
            });

            // 监听model变化，model变化后render页面
            model.observe(() => {
                if (initalData === model.state.data) {
                    initalData = null;
                    return;
                }

                renderId++;
                let currentId = renderId;

                if (!this.renderTask) {
                    this.renderTask = new Promise((resolve) => {
                        this.resolveRender = resolve;
                    });
                }

                // 等待动画结束再render，避免动画卡顿
                this.activity.waitAnimation(() => {
                    defer(() => {
                        // 避免同一个事件循环里多次渲染
                        if (renderId === currentId) {
                            this.render(() => {
                                this.renderTask = null;
                                this.resolveRender();
                                this.resolveRender = null;
                            });
                        }
                    });
                });
            });
        }
    }

    rendered(fn) {
        this.ready(() => {
            this.model.nextTick(() => {
                this.renderTask ? this.renderTask.then(fn) : fn();
            });
        });
    }

    update(attributes, cb) {
        if (!this.isSetup) {
            this.setup(attributes, cb);
        } else {
            this.model.set(attributes);
            cb && this.model.nextTick(cb);
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

        ReactDOM.render(createElement(this.renderPage), this.el, () => {
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
}