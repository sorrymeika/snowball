import React, { Component } from 'react';
import { PaginationStatus } from '../models/PaginationResult';
import LoadingStatusBar from './LoadingStatusBar';

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
                    : this.props.status === PaginationStatus.Loading
                        ? LoadMoreStatus.Loading
                        : this.props.status === PaginationStatus.End
                            ? LoadMoreStatus.Done
                            : this.props.status === PaginationStatus.None
                                ? ''
                                : LoadMoreStatus.Default;
        return <LoadingStatusBar message={message}></LoadingStatusBar>;
    }
}
