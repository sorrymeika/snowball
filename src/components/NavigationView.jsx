import React from "react";
import ReactDOM from "react-dom";

import VScrollView from './VScrollView';
import { $ } from '../utils';
import { android, osVersion } from "../env";

export default class NavigationView extends VScrollView {
    constructor(props) {
        super(props);

        this.state = {
            currentIndex: props.defaultIndex || 0
        };
        this.wrapperWidth = props.wrapperWidth || window.innerWidth;
        this.x = this.wrapperWidth * this.state.currentIndex * -1;
        this._navigationViewHeight = 0;
        this.navigationContents = [];

        this.addOnScrollStopListener(() => {
            if (this.currentNavigationContent.scrollTop == 0) {
                const length = this.props.navigationItems.length;
                let i = -1;
                while (++i < length) {
                    if (this.navigationContents[i]) {
                        this.navigationContents[i].scrollTop = 0;
                    }
                }
            }
        });
    }

    get currentNavigationContent() {
        return this.navigationContents[this.state.currentIndex];
    }

    scrollLeft(x) {
        if (x === undefined) {
            return this.container.scrollLeft + this.currentNavigationContent.scrollLeft;
        }
        this.container.scrollLeft = x;
    }

    scrollTop(y) {
        if (y === undefined) {
            return this.container.scrollTop + this.currentNavigationContent.scrollTop;
            // return this._y || 0;
        }

        const scrollHeight = this.container.scrollHeight;
        const clientHeight = this.container.clientHeight;
        const currentView = this.currentNavigationContent;

        // this._y = y;

        if (y > scrollHeight - clientHeight) {
            this.container.scrollTop = scrollHeight - clientHeight;
            currentView.scrollTop = y - (scrollHeight - clientHeight);

            // this.content.style.webkitTransform = `translate(0,${(scrollHeight - clientHeight) * -1}px) translateZ(0)`;
            // currentView.firstElementChild.style.webkitTransform = `translate(0,${(y - (scrollHeight - clientHeight)) * -1}px) translateZ(0)`;
        } else {
            this.container.scrollTop = y;
            currentView.scrollTop = 0;

            // this.content.style.webkitTransform = `translate(0%,${y * -1}px) translateZ(0)`;
            // currentView.firstElementChild.style.webkitTransform = `translate(0%,0px) translateZ(0)`;
        }
    }

    scrollWidth() {
        return this.container.scrollWidth + this.currentNavigationContent.scrollWidth;
    }

    scrollHeight() {
        const { currentNavigationContent } = this;
        return this.container.scrollHeight + currentNavigationContent.scrollHeight - currentNavigationContent.clientHeight;
    }

    scrollToContent() {
        const scrollHeight = this.container.scrollHeight;
        const clientHeight = this.container.clientHeight;
        this.container.scrollTop = scrollHeight - clientHeight;
    }

    componentDidMount() {
        this.container.__widget_scroll__ = this;
        this._navigationViewHeight = this.container.offsetHeight;
        this._navigationView.style.height = this._navigationViewHeight + 'px';
        this._adjustNavBarContentWidth();
        ReactDOM.findDOMNode(this).addEventListener('scroll', this._scroll, true);
    }

    componentWillUnmount() {
        ReactDOM.findDOMNode(this).removeEventListener('scroll', this._scroll, true);
    }

    _scroll = (e) => {
        this.isTriggerScroll = true;
    }

    _setWrapperRef = (ref) => {
        this.container = ref;

        const {
            scrollViewRef,
            onScrollViewInit,
            onScrollViewDestroy
        } = this.props;

        scrollViewRef && scrollViewRef(ref);
        if (ref) {
            onScrollViewInit && onScrollViewInit(this);
        } else {
            onScrollViewDestroy && onScrollViewDestroy();
        }
    }

    _navigationViewRef = (ref) => {
        this._navigationView = ref;
    }

    _navBarRef = (ref) => {
        this._navBar = ref;
    }

    _navBarContentRef = (ref) => {
        this._navBarContent = ref;
    }

    _adjustNavBarContentWidth() {
        const item = this._navBarContent.querySelector('.app-navigation-view-bar-item:last-child');
        this._navBarContent.style.width = `${item.offsetLeft + item.offsetWidth + 18}px`;
    }

    componentDidUpdate() {
        this._adjustNavBarContentWidth();
    }

    onNavigationIndexChange(index, cb) {
        if (this.state.currentIndex === index) return;

        const currentNavItem = this._navBar.querySelector('.app-navigation-view-bar-item:nth-child(' + (index + 1) + ')');
        const centerLeft = currentNavItem.offsetLeft - (this.wrapperWidth / 2) + (currentNavItem.offsetWidth / 2);
        if (this._navBar.scrollLeft != centerLeft) {
            this._navBar.scrollLeft = centerLeft;
        }

        this.x = this.wrapperWidth * index * -1;
        this.setState({
            currentIndex: index
        }, () => {
            cb && cb();
            this.props.navigationIndexChange(index, currentNavItem.innerText);
        });
    }

    _navContentRef = (ref) => {
        this._navContent = ref;
    }

    onNavContentTouchStart = (e) => {
        if (e.isHoldScroll || e.touches[0].pageX < 10) return;

        this.isTriggerScroll = false;
        this.possiblyScroll = -1;
        this.isNavTouchStarted = true;
        this.isNavMoved = false;
        this.navMoveX = this.navStartPageX = e.touches[0].pageX;
        this.navStartPageY = e.touches[0].pageY;
        this.navStartX = this.x || 0;
        this.navMinX = (this.props.navigationItems.length - 1) * this.wrapperWidth * -1;

        void $(this._navContent).removeClass('t_3')[0].clientHeight;
    }

    onNavContentTouchMove = (e) => {
        if (android && osVersion <= 4.3) {
            e.preventDefault();
        }

        if (this.isNavTouchStarted) {
            // touchmove事件触发两次后可能才触发scroll事件
            // 如果触发了scroll事件，就终止当前move事件
            if (this.possiblyScroll <= 0) {
                this.possiblyScroll++;
                return;
            } else if (this.isTriggerScroll) {
                return;
            }

            this.navMoveX = e.touches[0].pageX;

            const offsetX = this.navMoveX - this.navStartPageX;
            const offsetY = e.touches[0].pageY - this.navStartPageY;

            if (!this.isNavMoved && Math.abs(offsetY) > Math.abs(offsetX)) {
                this.isNavTouchStarted = false;
                return;
            }

            const left = this.navStartX + offsetX > 0
                ? this.navStartX + (offsetX / 4)
                : this.navStartX + offsetX < this.navMinX
                    ? this.navMinX + ((this.navStartX + offsetX - this.navMinX) / 4)
                    : this.navStartX + offsetX;

            this._navContent.style.transform = this._navContent.style.webkitTransform = 'translate(' + left + 'px,0px) translateZ(0)';
            this.x = left;
            this.isNavMoved = true;
            e.stopPropagation();
        }
    }

    onNavContentTouchEnd = (e) => {
        if (this.isNavTouchStarted && this.isNavMoved) {
            this.isNavTouchStarted = this.isNavMoved = false;

            let index = Math.floor(this.navStartX * -1 / this.wrapperWidth);
            index = this.x < this.navStartX ? index + 1 : (index - 1);
            index = Math.max(0, Math.min(this.props.navigationItems.length - 1, index));

            $(this._navContent).addClass('t_3');

            const left = this.wrapperWidth * index * -1;
            this.x = left;
            this._navContent.style.transform = this._navContent.style.webkitTransform = 'translate(' + left + 'px,0px) translateZ(0)';

            this.onNavigationIndexChange(index);
            e.preventDefault();
            e.stopPropagation();
        }
    }

    render() {
        const {
            className,
            mainStyle,
            containerStyle,
            children,
            navigationClassName,
            navigationItems,
            renderNavigationContent,
            navBarStyle,
            selectedNavStyle
        } = this.props;

        return (
            <div
                ref={this._setWrapperRef}
                onScroll={this.onScroll}
                onTouchStart={this.onTouchStart}
                onTouchMove={this.onTouchMove}
                onTouchEnd={this.onTouchEnd}
                onTouchCancel={this.onTouchCancel}
                className={(className || '') + ' app-main'}
                style={{
                    overflow: 'hidden',
                    ...mainStyle
                }}
            >
                <div
                    style={containerStyle}
                    ref={this._setContentRef}
                >
                    {children}
                    <div
                        className={"app-navigation-view" + (navigationClassName ? ' ' + navigationClassName : '')}
                        style={{ height: this._navigationViewHeight }}
                        ref={this._navigationViewRef}
                    >
                        <div
                            className="app-navigation-view-bars"
                            ref={this._navBarRef}
                        >
                            <ul
                                className="clearfix"
                                style={{
                                    width: 2000,
                                    ...navBarStyle
                                }}
                                ref={this._navBarContentRef}
                            >
                                {
                                    navigationItems.map((item, i) => {
                                        return (
                                            <li
                                                className={"app-navigation-view-bar-item" + (i === this.state.currentIndex ? ' curr' : '')}
                                                style={
                                                    i === this.state.currentIndex
                                                        ? selectedNavStyle
                                                        : null
                                                }
                                                onClick={() => this.onNavigationIndexChange(i)}
                                            >{item.title}</li>
                                        );
                                    })
                                }
                            </ul>
                        </div>
                        <div
                            className="app-navigation-view-content flex"
                            ref={this._navContentRef}
                            onTouchStart={this.onNavContentTouchStart}
                            onTouchMove={this.onNavContentTouchMove}
                            onTouchEnd={this.onNavContentTouchEnd}
                            style={{
                                width: navigationItems.length * 100 + '%',
                                transform: `translate(${this.x}px, 0%) translateZ(0)`,
                                '-webkit-transform': `translate(${this.x}px, 0%) translateZ(0)`
                            }}
                        >
                            {
                                navigationItems.map((item, i) => {
                                    return (
                                        <div
                                            className="app-navigation-view-content-item flexitem"
                                            onScroll={this.onScroll}
                                            ref={(ref) => {
                                                this.navigationContents[i] = ref;
                                                item.contentRef && item.contentRef(ref);
                                            }}
                                        >
                                            {
                                                renderNavigationContent
                                                    ? renderNavigationContent(item, i, this.state.currentIndex)
                                                    : item.content
                                            }
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}