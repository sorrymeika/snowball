import ReactDOM from 'react-dom';
import React, { Component } from 'react';
import util from '../core/util';

export default class Portal extends Component {
    componentWillMount() {
        this.container = document.createElement('div');
    }

    componentDidMount() {
        this.view = util.$(ReactDOM.findDOMNode(this)).closest('.view')[0];
        this.view.appendChild(this.container);
    }

    componentWillUnmount() {
        this.view.removeChild(this.container);
    }

    render() {
        const { children, ...props } = this.props;
        const element = <div {...props}>{children}</div>;
        ReactDOM.unstable_renderSubtreeIntoContainer(this, element, this.container);
        return <div style={{ display: 'none' }}></div>;
    }
}