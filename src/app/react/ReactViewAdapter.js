
import React, { Component, createElement } from 'react';
import ReactDOM from 'react-dom';
import { IViewAdapter } from "../types";
import { PageContext, inject } from './inject';
import ViewAdapter from '../core/ViewAdapter';

export default class ReactViewAdapter implements IViewAdapter {
    static match(type) {
        return typeof type === 'function';
    }

    constructor(type, { el, page, activity, store }) {
        this.el = el;
        this.page = page;
        this.activity = activity;
        this.store = store;

        const reactiveView = type.isSnowballInjector === true ? type : inject((store) => store)(type);
        const adapter = this;

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
                if (activity.transitionTask) {
                    if (!this.isRenderingPending) {
                        this.isRenderingPending = true;
                        activity.transitionTask.then(() => {
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
                        value={adapter.store}
                    >{createElement(reactiveView, adapter._reactProps)}</PageContext.Provider>
                );
            }
        }
        this.PageProvider = PageProvider;
    }

    init(attributes, cb) {
        this.render(attributes, cb);
    }

    update(attributes, cb) {
        this.render(attributes, cb);
    }

    /**
     * 渲染当前页面
     * @param {function} [callback] 渲染成功回调函数
     */
    render(props, callback) {
        this._reactProps = { ...props };

        const lifecycle = this.activity.lifecycle;
        if (lifecycle.shouldRender && !lifecycle.shouldRender(this._reactProps)) {
            callback && callback();
            return;
        }

        let timer,
            now;

        if (process.env.NODE_ENV !== 'test') {
            timer = `render ${this.activity.location.path} spend`;
            now = Date.now();
            console.time(timer);
        }

        ReactDOM.render(createElement(this.PageProvider, this._reactProps), this.el, () => {
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
    }
}

ViewAdapter.push(ReactViewAdapter);