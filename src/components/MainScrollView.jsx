import React from 'react';
import ScrollView from './ScrollView';
import VScrollView from './VScrollView';
import LoadMore from './LoadMore';
import { IS_LTE_ANDROID_4_3 } from '../env';

let USE_DOM_SCROLL = !IS_LTE_ANDROID_4_3;

function MainScrollView(props, ref) {
    if (process.env.NODE_ENV === 'PRELOAD' || USE_DOM_SCROLL) {
        return (
            <ScrollView
                {...props}
                className={(props.className || '') + ' app-main'}
                ref={ref}
            />
        );
    }

    const { className, children, loadMoreStatus, ...moreProps } = props;
    return (
        <VScrollView
            {...moreProps}
            className={(className || '') + ' app-main'}
            ref={ref}
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

export default React.forwardRef(MainScrollView);