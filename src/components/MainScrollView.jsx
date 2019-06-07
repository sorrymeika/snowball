import React from 'react';
import ScrollView from './ScrollView';
import inject from '../decorators/inject';

import VScrollView from './VScrollView';
import LoadMore from './LoadMore';
import { android, osVersion } from '../core/env';

let USE_DOM_SCROLL = !(android && osVersion <= 4.3);

export default function MainScrollView(props) {
    const { scrollViewRef } = props;
    if (process.env.NODE_ENV === 'PRELOAD' || USE_DOM_SCROLL) {
        return (
            <ScrollView
                {...props}
                className={(props.className || '') + ' app-main'}
                ref={scrollViewRef}
            ></ScrollView>
        );
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