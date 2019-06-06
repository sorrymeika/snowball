import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { $ } from '../snowball/utils/dom';
import { Event } from '../snowball/core/event';
import Touch from '../core/touch';

type ItemSwiperProps = {
    // buttons的宽度，即item向左可滑动的距离
    width: number,
    // item的css选择器
    itemsSelector: string,
    // 按钮
    buttons: { selector: string, onClick: (e: any) => any }[]
}

/**
 * 左滑操作，如：左滑删除
 * 事件绑定在 ItemSwiper 上，增加性能
 * @example
 * <ItemSwiper
 *  width={80}
 *  buttons={[ { selector: '.J_Del', onClick(e) { console.log(e.currentTarget.getAttribute('id')) } } ]}
 *  itemsSelector=".J_Item"
 *  className="cart"
 * >
 *      <ul> <li className="ps_r"><div className="J_Item"><img /> <p>内容</p></div><button id={item.id} className="J_Del dock_tbr w_80">删除</button></li> </ul>
 * <ItemSwiper>
 */
export default class ItemSwiper extends Component<ItemSwiperProps, any> {

    componentDidMount() {
        const { width = 80, itemsSelector, buttons } = this.props;
        const el = ReactDOM.findDOMNode(this);
        const self = this;

        this.$mask = $('<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0);display:none;z-index:3000"></div>')
            .appendTo('body')
            .on('touchend', function (e) {
                var point = e.changedTouches[0];
                self.$mask.hide();
                self.touch.scrollTo(0, 0, 200);

                if (this._cancel) {
                    return;
                }
                // 强制引发reflow，获取的el才能正确
                void self.$mask[0].offsetHeight;
                var el = document.elementFromPoint(point.pageX, point.pageY);
                var target = self.$target[0].parentNode;

                if (buttons && (target == el || $.contains(target, el))) {
                    var i = -1;
                    var length = buttons.length;
                    var button;
                    while (++i < length) {
                        button = buttons[i];
                        for (var node = el; node != target.parentNode; node = node.parentNode) {
                            if ($(node).is(button.selector)) {
                                button.onClick.call(self, new Event('click', { currentTarget: node, target: el }));
                                return false;
                            }
                        }
                    }
                }
                return false;
            })
            .on('touchstart', function () {
                this._cancel = false;
            })
            .on('touchmove', function () {
                this._cancel = true;
            });

        this.touch = new Touch(el, {
            enableVertical: false,
            enableHorizontal: true,
            maxDuration: 200,
            divisorX: width,
            children: itemsSelector
        });

        this.touch.on('start', function (e) {
            self.$target = $(e.currentTarget);
            this.maxX = width;
            this.minX = 0;
            if (this.deltaX < 0) {
                this.stop();
            }
        })
            .on('move', function (e) {
                self.$target.css({
                    "-webkit-transform": 'translate(-' + this.x + 'px,0px) translateZ(0)'
                });
                return false;
            })
            .on('end', function () {
                self.$mask.show();
            })
            .on('stop', function () {
                if (this.x != width && this.x != 0) {
                    this.scrollTo(width, 0, 50);
                }
            });
    }

    componentWillUnmount() {
        this.$mask.off().remove();
    }

    render() {
        return <div className={this.props.className}>{this.props.children}</div>;
    }
}
