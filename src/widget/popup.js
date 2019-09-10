import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { $ } from '../utils';

var popups = [];
var $mask = $('<div class="app-popup-mask"></div>')
    .prependTo('body')
    .on($.fx.transitionEnd, function () {
        if (!$mask.hasClass('show')) {
            this.style.display = 'none';
            $mask.removeClass('did_show');
        } else {
            $mask.addClass('did_show');
        }
    })
    .on('click', () => {
        popups.length > 0 && popups[popups.length - 1].clickMaskToHide && hidePopup(true);
    });

function enqueuePopup(cb) {
    popups.length
        ? popups[popups.length - 1].then(cb)
        : cb();
}

function hidePopup(isClickMaskToHide) {
    if (popups.length) popups[popups.length - 1].hide(isClickMaskToHide);
}

function showMask() {
    void $mask.show()[0].clientHeight;
    $mask.addClass('show');
}

type PopupProps = {
    title: string,
    content: string | any,
    className: string,
    animate: string,
    inQueue: boolean,
    clickMaskToHide: boolean,
    onHide?: (isClickMaskToHide?: boolean) => any,
    onShow?: (ref: any) => void,
    portal: Component<P>,
}

class Popup {
    constructor({ title, className, animate = "scale", clickMaskToHide = false, ...props }: PopupProps) {
        this.props = props;
        this.clickMaskToHide = clickMaskToHide;
        this.$container = $(`<div class="app-popup-container app-popup-style-${animate}"><div class="app-popup-container-${animate}"></div></div>`)
            .addClass(className || '')
            .on($.fx.transitionEnd, function () {
                if (!$(this).hasClass('show')) {
                    this.parentNode && this.parentNode.removeChild(this);
                    this.onFadeOut && this.onFadeOut();
                }
            })
            .on('click', '[action]', async (e) => {
                var actionName = $(e.currentTarget).attr('action');
                await this.props[actionName].call(this, e);

                if ((this.props.type === 'alert' && actionName === 'onOk') || actionName === 'onCancel') {
                    this.hide();
                }
            });
        this._showNow = this._showNow.bind(this);
    }

    find(selector) {
        return this.$container.find(selector);
    }

    get visible() {
        return this.$container.hasClass('show');
    }

    hide(isClickMaskToHide) {
        if (!this.visible) return;

        (popups.length <= 1) && $mask.removeClass('show');
        this.$container.removeClass('show');

        // 等待动画结束
        setTimeout(() => {
            for (var i = popups.length; i >= 0; i--) {
                if (popups[i] === this) {
                    popups.splice(i, 1);
                    (popups.length == 0) && $mask.removeClass('show');
                    break;
                }
            }
        }, 300);
        this.onHide && this.onHide();
        this.props.onHide && this.props.onHide(isClickMaskToHide);
    }

    show() {
        var { inQueue = true } = this.props;

        if (this.visible || !inQueue) {
            this._showNow();
            return;
        }

        if (this.promise) return;

        this.promise = new Promise((resolve, reject) => {
            this.addOnHideListener(() => {
                this.promise = null;
                resolve();
            });
            enqueuePopup(this._showNow);
        });
    }

    addOnHideListener(fn) {
        const onHide = this.onHide;
        this.onHide = () => {
            onHide && onHide();
            fn();
        };
    }

    addOnFadeOutListener(fn) {
        const onFadeOut = this.onFadeOut;
        this.onFadeOut = () => {
            onFadeOut && onFadeOut();
            fn();
        };
    }

    _showNow() {
        var { $container } = this;
        var { content, portal, onShow } = this.props;
        var children = content;

        if (children.length) {
            content = children[0];
        }

        if (React.isValidElement(content) || content instanceof React.Component) {
            content = children.length && children.length > 1 ? <div>{children}</div> : content;
            if (portal) {
                if (!ReactDOM.unstable_renderSubtreeIntoContainer) {
                    class Provider extends React.Component {
                        getChildContext() {
                            return portal.context;
                        }
                        render() {
                            return content;
                        }
                    }
                    ReactDOM.render(React.createElement(Provider), $container.children()[0]);
                } else {
                    ReactDOM.unstable_renderSubtreeIntoContainer(portal, content, $container.children()[0]);
                }
            } else {
                ReactDOM.render(content, $container.children()[0]);
            }
            this.addOnFadeOutListener(() => ReactDOM.unmountComponentAtNode($container.children()[0]));
        } else {
            $container.children().append(children);
        }

        if (this.visible) return;

        $container.insertBefore($mask);
        void $container[0].offsetHeight;

        showMask();
        $container.addClass('show');

        onShow && onShow(this);

        popups.push(this);
    }

    then(fn) {
        this.promise
            ? this.promise.then(fn)
            : fn();
    }
}

export const popup = {

    get length() {
        return popups.length;
    },

    /**
     * alert({title: '结束咨询',content: '您是否确认结束本次咨询?',okText: '确定',onOk: function(){} })
     * @param {Object} params
     * @param {String|ReactElement} params.title 标题
     * @param {String|ReactElement} params.content 正文
     * @param {String|ReactElement} [params.okText] 按钮名称
     * @param {String|ReactElement} [params.clickMaskToHide] 点击区域外关闭
     * @param {Function} params.onOk 点击确认事件
     */
    alert: function ({ title, content, okText, onOk, ...params }) {
        var contentElement = (
            <div>
                {
                    title
                        ? <div className="app-popup-title">{title}</div>
                        : null
                }
                <div className="app-popup-content">{content}</div>
                <div className="app-popup-action"><button className="btn" action="onOk">{okText || '确定'}</button></div>
            </div>
        );

        return this.popup({
            ...params,
            type: 'alert',
            content: contentElement,
            onOk: onOk || function () { }
        });
    },

    /**
     * {title: '结束咨询',content: '您是否确认结束本次咨询?', okText: '结束咨询', onOk: function(){}, cancelText: '继续咨询', onCancel: function(){}, }
     * @param {Object} params
     * @param {String|ReactElement} params.title 标题
     * @param {String|ReactElement} params.content 正文
     * @param {String} params.okText
     * @param {Function} params.onOk 确认事件
     * @param {String} params.cancelText
     * @param {Function} params.onCancel 取消事件
     */
    confirm: function ({ title, content, okText, onOk, cancelText, onCancel, ...params }) {
        var contentElement = (
            <div>
                {
                    title
                        ? <div className="app-popup-title">{title}</div>
                        : null
                }
                <div className="app-popup-content">{content}</div>
                <div className="app-popup-action"><button className="btn btn_cancel" action="onCancel">{cancelText || '取消'}</button><button className="btn" action="onOk">{okText || '确定'}</button></div>
            </div>
        );
        return this.popup({
            ...params,
            type: 'confirm',
            content: contentElement,
            onOk,
            onCancel: onCancel || function () { }
        });
    },

    /**
     * @example
     * popup.prompt({ title: '给医生的回答打下分吧', placeholder: '我想要说几句', maxLength: 100, cancelText: '取消', onOk: function(){}, okText: '确认' })
     * @param {Object} params
     * @param {String} params.title 标题
     * @param {String} params.placeholder
     * @param {String} params.okText
     * @param {Function} params.onOk 确认事件
     * @param {String} params.cancelText
     * @param {Function} params.onCancel 取消事件
     */
    prompt: function ({ title, placeholder, content, okText, onOk, cancelText, onCancel, ...params }) {

        var contentElement = (
            <div>
                <div class="app-popup-title">{title}</div>
                <div class="app-popup-content">
                    <input className="app-popup-prompt-input" placeholder={placeholder} />
                </div>
                <div class="app-popup-action">
                    <button class="btn btn_cancel" action="onCancel">{cancelText || '取消'}</button>
                    <button class="btn" action="onOk">{okText || '确认'}</button>
                </div>
            </div>
        );

        return this.popup({
            ...params,
            type: 'prompt',
            content: contentElement,
            onOk: function () {
                var value = this.find('.app-popup-prompt-input').val();

                return onOk.call(this, value);
            },
            onCancel
        });
    },

    /**
     * 弹框
     * @example {content:'内容<button action="confirm"></button>',confirm:function(){}}
     * @param {Object} params
     * @param {String | ReactElement} params.title 标题
     * @param {String | ReactElement} params.content 正文
     * @param {string} params.animate 动画效果 scale|up
     * @param {boolean} [params.inQueue=true] 是否在上一个弹框关闭后显示
     * @param {boolean} params.clickMaskToHide 点击蒙层是否关闭 true|false
     */
    popup: function (props: PopupProps) {
        var ret = new Popup(props);
        ret.show();
        return ret;
    },

    hidePopup,

    hideAllPopups: function () {
        if (popups.length) {
            $mask.removeClass('show');
            popups.forEach((one) => {
                one.hide();
            });
            popups.length = 0;
        }
    }
};

popup.Popup = class PopupComponent extends React.Component {
    onClickMask = () => {
        this.props.onClickMask && this.props.onClickMask();
    }

    componentWillMount() {
        $mask.on('click', this.onClickMask);
    }

    componentWillUnmount() {
        $mask.off('click', this.onClickMask);
    }

    render() {
        if (this.props.visible) {
            if (!this.popup) {
                this.popup = popup.popup({
                    ...this.props,
                    portal: this,
                    content: this.props.children
                });
            } else {
                this.popup.props.content = this.props.children;
                this.popup.show();
            }
        } else if (this.popup) {
            this.popup.hide();
        }
        return null;
    }
};

function onBeforeBack(event) {
    if (popups.length && popups.some((item) => item.visible)) {
        popup.hidePopup();
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}
window.addEventListener('beforeback', onBeforeBack);

export default popup;

