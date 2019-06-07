import React from 'react';
import LoadMore from './LoadMore';

export default function ScrollElement(props) {
    const { loadMoreStatus } = props;

    return (
        <div style={props.style} className={(props.className || "") + " app-scrollview"} ref={props.refElement}>
            <div className="app-scroller-container" style={props.containerStyle}>
                {
                    props.pullToRefresh
                        ? <div class="app-scroller-pull-to-refresh" style={{
                            height: 50,
                            textAlign: 'center',
                            lineHeight: '50px'
                        }}>下拉刷新</div>
                        : null
                }
                {
                    props.children
                }
                {
                    loadMoreStatus ? <LoadMore status={loadMoreStatus} /> : null
                }
            </div>
        </div >
    );
}