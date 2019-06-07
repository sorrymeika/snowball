import React from 'react';
import ScrollView from './ScrollView';
import ScrollElement from './ScrollElement';
import { getApplication, getActivedPage } from '../core/app';
import { $ } from "../snowball/utils/dom";
import inject from '../core/decorators/inject';

import VScrollView from './VScrollView';
import LoadMore from './LoadMore';
import { android, osVersion } from '../core/env';

let USE_DOM_SCROLL = !(android && osVersion <= 4.3);

class DOMMainScrollView extends ScrollView {
    constructor(props) {
        super(props);

        var isUseWindowScroll = getApplication().isUseWindowScroll();
        if (isUseWindowScroll) {
            this._page = getActivedPage();
            this._page.on('pause destroy', this.unbindWindowScrollHandler);
            this._page.on('resume', this.bindWindowScrollHandler);
            this.bindWindowScrollHandler();
        }
    }

    _onWindowScroll = (e) => {
        var documentElement = document.documentElement;
        var body = document.body;
        var event = {
            target: this.container,
            x: documentElement.scrollLeft || body.scrollLeft,
            y: documentElement.scrollTop || body.scrollTop,
            width: window.innerWidth,
            height: window.innerHeight,
            scrollHeight: documentElement.scrollHeight,
            scrollWidth: documentElement.scrollWidth
        };
        this._onScroll(event);

        if (this._stm) clearTimeout(this._stm);
        this._stm = setTimeout(() => {
            this._stm = null;
            $(this.container).trigger('scrollStop', event);
        }, 80);
    }

    bindWindowScrollHandler = () => {
        window.addEventListener('scroll', this._onWindowScroll, false);
    }

    unbindWindowScrollHandler = () => {
        window.removeEventListener('scroll', this._onWindowScroll, false);
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

export default function MainScrollView(props) {
    const { scrollViewRef } = props;
    if (process.env.NODE_ENV === 'SNAPSHOT' || USE_DOM_SCROLL) {
        return <DOMMainScrollView {...props} className={(props.className || '') + ' app-main'} ref={scrollViewRef}></DOMMainScrollView>;
    }
    const { className, children, loadMoreStatus, onScrollViewInit, onScrollViewDestroy, ...moreProps } = props;
    return (
        <VScrollView
            {...moreProps}
            className={(className || '') + ' app-main'}
            ref={(ref) => {
                scrollViewRef && scrollViewRef(ref);
                if (ref) {
                    onScrollViewInit && onScrollViewInit(ref);
                } else {
                    onScrollViewDestroy && onScrollViewDestroy();
                }
            }}
        >
            {
                children
            }
            {
                loadMoreStatus ? <LoadMore status={loadMoreStatus} /> : null
            }
        </VScrollView>
    );
}

export const MainScrollViewWithHandler = inject((store) => {
    const mainScrollViewHandler = store.mainScrollViewHandler || store.mainScroll;
    return (
        mainScrollViewHandler
            ? {
                onScrollViewInit: mainScrollViewHandler.svOnInit,
                onScrollViewDestroy: mainScrollViewHandler.svOnDestroy
            }
            : {}
    );
})(MainScrollView);