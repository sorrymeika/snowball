import React, { Component } from 'react';
import LoadingStatusBar from './LoadingStatusBar';

export const LoadStatus = {
    Error: -3,
    Loading: -2,
    Start: -1,
    None: 0,
    Continue: 1,
    End: 2
};

export const LoadMoreStatus = {
    Default: '上拉加载更多',
    Loading: '正在加载中...',
    Done: '已经到底了'
};

export default class LoadMore extends Component {
    render() {
        var message =
            process.env.NODE_ENV === 'PRELOAD'
                ? '正在加载中...'
                : typeof this.props.status === 'string'
                    ? this.props.status
                    : this.props.status === LoadStatus.Loading
                        ? LoadMoreStatus.Loading
                        : this.props.status === LoadStatus.End
                            ? LoadMoreStatus.Done
                            : this.props.status === LoadStatus.None
                                ? ''
                                : LoadMoreStatus.Default;
        return <LoadingStatusBar message={message}></LoadingStatusBar>;
    }
}
