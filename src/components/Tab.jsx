import React, { Component, ReactNode } from "react";
import ReactDOM from "react-dom";

import { $ } from '../utils';

type TabItem = {
    title: string,
    titleClassName: string,
    titlePrefix: ReactNode,
    titleProps: any,
    content: ReactNode
}

type TabProps = {
    items: TabItem[],
    className: string,
    onTabChange: () => never
}

export default class Tab extends Component<TabProps, { index: number }> {
    constructor(props) {
        super(props);

        this.state = {
            index: this.props.index || 0
        };
        this.wrapWidth = this.props.wrapWidth || window.innerWidth;
        this.x = this.wrapWidth * this.state.index * -1;
    }

    componentDidMount() {
        this.wrapWidth = ReactDOM.findDOMNode(this).clientWidth || window.innerWidth;
        this.x = this.wrapWidth * this.state.index * -1;
        this.adjustCursorPosition();

        !this.wrapWidth && setTimeout(() => {
            this.wrapWidth = ReactDOM.findDOMNode(this).clientWidth || window.innerWidth;
        }, 0);
        ReactDOM.findDOMNode(this).addEventListener('scroll', this._scroll, true);
    }

    componentWillUnmount() {
        ReactDOM.findDOMNode(this).removeEventListener('scroll', this._scroll, true);
    }

    _scroll = (e) => {
        this.isTriggerScroll = true;
    }

    onTabTitleClick(index) {
        void $(this.body).removeClass('t_3')[0].clientHeight;

        this.onTabChange(index, () => {
            $(this.body).addClass('t_3');
        });
    }

    onTabChange(index, cb) {
        if (this.state.index === index) return;
        this.x = this.wrapWidth * index * -1;
        this.setState({
            index
        }, () => {
            this.adjustCursorPosition();
            cb && cb();
        });
        this.props.onTabChange && this.props.onTabChange(index);
    }

    setBodyRef = (body) => {
        this.body = body;
    }

    setCursorRef = (cursor) => {
        this.cursor = cursor;
    }

    onBodyTouchStart = (e) => {
        if (e.isHoldScroll || e.touches[0].pageX < 10) return;

        this.isTriggerScroll = false;
        this.possiblyScroll = -1;
        this.isStart = true;
        this.isMove = false;
        this.moveX = this.startPageX = e.touches[0].pageX;
        this.startPageY = e.touches[0].pageY;
        this.startX = this.x || 0;
        this.minX = (this.props.items.length - 1) * this.wrapWidth * -1;
        void $(this.body).removeClass('t_3')[0].clientHeight;
    }

    onBodyTouchMove = (e) => {
        if (this.isStart) {
            // touchmove事件触发两次后可能才触发scroll事件
            // 如果触发了scroll事件，就终止当前move事件
            if (this.possiblyScroll <= 0) {
                this.possiblyScroll++;
                return;
            } else if (this.isTriggerScroll) {
                return;
            }

            this.moveX = e.touches[0].pageX;
            var offsetX = this.moveX - this.startPageX;
            var offsetY = e.touches[0].pageY - this.startPageY;

            if (!this.isMove && Math.abs(offsetY) > Math.abs(offsetX)) {
                this.isStart = false;
                return;
            }

            var left = this.startX + offsetX > 0
                ? this.startX + (offsetX / 4)
                : this.startX + offsetX < this.minX
                    ? this.minX + ((this.startX + offsetX - this.minX) / 4)
                    : this.startX + offsetX;
            this.body.style.transform = this.body.style.webkitTransform = 'translate(' + left + 'px,0px)';
            this.x = left;
            this.isMove = true;
            e.preventDefault();
            e.stopPropagation();
        }
    }

    onBodyTouchEnd = (e) => {
        if (this.isStart && this.isMove) {
            this.isStart = this.isMove = false;

            var index = Math.floor(this.startX * -1 / this.wrapWidth);
            index = this.x < this.startX ? index + 1 : (index - 1);
            index = Math.max(0, Math.min(this.props.items.length - 1, index));

            $(this.body).addClass('t_3');

            var left = this.wrapWidth * index * -1;
            this.x = left;
            this.body.style.transform = this.body.style.webkitTransform = 'translate(' + left + 'px,0px)';

            this.onTabChange(index);
            e.preventDefault();
            e.stopPropagation();
        }
    }

    adjustCursorPosition() {
        var $title = $(ReactDOM.findDOMNode(this)).find('.app-tab-head .curr .app-tab-title');
        $(this.cursor).addClass('t_3');

        var title = $title[0];
        var left = title.offsetLeft;
        var parent = title.offsetParent;

        while (parent && parent.nodeName !== 'div') {
            left += parent.offsetLeft;
            parent = parent.offsetParent;
        }

        this.cursor.style.width = $title.width() + 'px';
        this.cursor.style.webkitTransform = this.cursor.style.transform = 'translate(' + left + 'px,0px)';
    }

    render() {
        let { items, className } = this.props;

        return (
            <div className={className + " app-tab-wrap ps_r"}>
                <div className="app-tab-head bd_b ps_r ta_c bg_fff">
                    <ul className="flex">
                        {
                            items.map((item, i) => {
                                return (
                                    <li
                                        {...item.titleProps}
                                        key={i}
                                        onClick={this.onTabTitleClick.bind(this, i)}
                                        className={(this.state.index === i ? 'curr ' : '') + "flexitem " + (item.titleClassName || '')}
                                    >{item.titlePrefix}<span class="app-tab-title">{item.title}</span></li>
                                );
                            })
                        }
                    </ul>
                    <div className="app-tab-head-cursor ps_a" ref={this.setCursorRef}></div>
                </div>
                <div className="dock app-tab-body bg_fff flex fd_c w_1x">
                    <div
                        ref={this.setBodyRef}
                        onTouchStart={this.onBodyTouchStart}
                        onTouchMove={this.onBodyTouchMove}
                        onTouchEnd={this.onBodyTouchEnd}
                        className="dock app-tab-body-inner dp_f t_3"
                        style={{
                            width: items.length * 100 + '%',
                            transform: 'translate(' + this.x + 'px,0px)',
                            webkitTransform: 'translate(' + this.x + 'px,0px)'
                        }}
                    >
                        {
                            items.map((item) => item.content)
                        }
                    </div>
                </div>
            </div >
        );
    }
}