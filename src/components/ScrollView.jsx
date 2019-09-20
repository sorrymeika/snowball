import React, { Component } from 'react';
import { isScrollToBottom } from '../utils';
import { Service } from '../app';
import scroll from '../widget/scroll';
import ScrollElement from './ScrollElement';

interface IScrollViewProps {
    vScroll: boolean;
    hScroll: boolean;
    loadMoreStatus: string;
    containerStyle?: any,
    onScrollViewInit?: (scrollView: any, element: HTMLElement) => never;
    onScrollViewDestroy?: () => never;
    onScroll?: () => never;
    onScrollToBottom?: () => never;
    onScrollToTop?: () => never;
    pullToRefresh?: (resolve: () => never, reject: () => never) => any;
}

/**
 * 滚动条滚动处理
 */
class ScrollHandler extends Service {

    onInit = this.ctx.createEvent();
    onDestroy = this.ctx.createEvent();
    _onScrollToBottom = this.ctx.createEvent();

    constructor(options) {
        super();

        this.options = {
            hasFixableBar: false,
            ...options
        };
        this.isDestroy = false;

        this.onInit(this.init);

        this.onDestroy(() => {
            this.isDestroy = true;
        });
    }

    scrollViewRef;
    init = (scrollView) => {
        if (this.scrollViewRef != scrollView) {
            this.scrollViewRef = scrollView;
        }
    }

    getScrollView(cb) {
        if (!cb) {
            return new Promise((resolve) => this.getScrollView(resolve));
        }
        if (this.scrollViewRef || this.isDestroy) {
            cb(this.scrollViewRef);
        } else {
            this.onInit.one(() => cb(this.scrollViewRef));
        }
    }

    getScrollElement(cb) {
        if (!cb) return new Promise((resolve) => this.getScrollElement(resolve));
        this.getScrollView((scrollView) => cb(scrollView.container));
    }

    addOnScrollStopListener(fn) {
        this.getScrollView((scrollView) => scrollView.addOnScrollStopListener(fn));
    }

    removeOnScrollStopListener(fn) {
        this.getScrollView((scrollView) => scrollView.removeOnScrollStopListener(fn));
    }

    addOnScrollListener = async (fn) => {
        this.getScrollView((scrollView) => scrollView.addOnScrollListener(fn));
    }

    removeOnScrollListener = async (fn) => {
        this.getScrollView((scrollView) => scrollView.removeOnScrollListener(fn));
    }

    isScrollToBottom() {
        return !this.scrollViewRef
            ? false
            : typeof this.scrollViewRef.isScrollToBottom === 'function'
                ? this.scrollViewRef.isScrollToBottom()
                : isScrollToBottom(this.scrollViewRef.container);
    }

    addOnScrollToBottomListener = (fn) => {
        if (!this.isAddOnScrollToBottomListener) {
            this.addOnScrollStopListener(() => {
                const isReachBottom = typeof this.scrollViewRef.isScrollToBottom === 'function'
                    ? this.scrollViewRef.isScrollToBottom()
                    : isScrollToBottom(this.scrollViewRef.container);

                if (isReachBottom) {
                    this._onScrollToBottom.emit();
                }
            });
            this.isAddOnScrollToBottomListener = true;
        }
        return this._onScrollToBottom(fn);
    }

    scrollToTop(duration?: number) {
        this.getScrollView((scrollView) => scrollView.scrollToTop(duration));
    }

    scrollTo(x, y, duration?: number, cb?) {
        this.getScrollView((scrollView) => scrollView.scrollTo(x, y, duration, cb));
    }

    detectImageLazyLoad() {
        this.scrollViewRef && this.scrollViewRef.detectImageLazyLoad();
    }
}

export default class ScrollView extends Component<IScrollViewProps, any> {
    static createHandler = (options) => {
        return new ScrollHandler(options);
    }

    componentDidMount() {
        this.imageLazyLoad();
    }

    componentWillUnmount() {
        this.props.onScrollViewDestroy && this.props.onScrollViewDestroy();
        this.scroll.destroy();
        this.scroll = null;
        this.container.removeEventListener('scrollStop', this._onScrollStop, false);
    }

    componentDidUpdate() {
        this.imageLazyLoad();
    }

    setRef = (container) => {
        if (!container || this.container == container) return;

        var { vScroll = true, hScroll = false, onScrollToTop, onScrollToBottom, pullToRefresh } = this.props;

        this.scroll = scroll.bind(container, {
            vScroll,
            hScroll,
            onScroll: this._onScroll,
            onScrollToBottom,
            onScrollToTop,
            pullToRefresh
        });
        this.container = container;
        this.props.onScrollViewInit && this.props.onScrollViewInit(this, container);
        this.container.addEventListener('scrollStop', this._onScrollStop, false);
    }

    _onScrollStop = (e, params) => {
        this.scrollStopListenerCache.forEach(fn => fn(e, params || e._args));
        this.props.onScrollStop && this.props.onScrollStop(e, params || e._args);
    }

    scrollStopListenerCache = [];
    addOnScrollStopListener(fn) {
        this.scrollStopListenerCache.push(fn);
    }

    removeOnScrollStopListener(fn) {
        var index = this.scrollStopListenerCache.indexOf(fn);
        if (index != -1) {
            this.scrollStopListenerCache.splice(index, 1);
        }
    }

    _onScroll = (e) => {
        this.props.onScroll && this.props.onScroll(e);
        this.scrollListenerCache.forEach(fn => fn(e));
    }

    scrollListenerCache = [];
    addOnScrollListener = (fn) => {
        this.scrollListenerCache.push(fn);
    }

    removeOnScrollListener = (fn) => {
        var index = this.scrollListenerCache.indexOf(fn);
        if (index != -1) {
            this.scrollListenerCache.splice(index, 1);
        }
    }

    scrollTop(y) {
        return this.scroll.eq(0).scrollTop(y);
    }

    scrollToTop(duration?: number) {
        this.scroll.eq(0).scrollTo(0, 0, duration);
    }

    scrollTo(x: number, y: number, duration?: number) {
        this.scroll.eq(0).scrollTo(x, y, duration);
    }

    scrollToEnd() {
        this.scroll.scrollToEnd();
    }

    // 立即加载需要懒加载的图片
    imageLazyLoad() {
        this.scroll && this.scroll.eq(0).imageLazyLoad();
    }

    // 一段时间（默认80ms）后没有再次调用该方法，加载需要懒加载的图片
    detectImageLazyLoad() {
        this.scroll && this.scroll.eq(0).detectImageLazyLoad();
    }

    render() {
        const props = this.props;

        return (
            <ScrollElement
                style={props.style}
                containerStyle={props.containerStyle}
                className={props.className}
                pullToRefresh={props.pullToRefresh}
                loadMoreStatus={props.loadMoreStatus}
                refElement={this.setRef}
            >
                {
                    props.children
                }
            </ScrollElement>
        );
    }
}
