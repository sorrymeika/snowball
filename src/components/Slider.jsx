import { Component } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';

import SliderWidget from '../widget/slider';

interface ISliderDataItem {
    src: string;
    url: string;
}

interface ISliderProps {
    data: ISliderDataItem[];
    // 自动播放间隔时间, 0为不自动播放
    autoLoop: number;
}

export default class Slider extends Component<ISliderProps, never> {
    shouldComponentUpdate(nextProps) {
        if (this.props.data !== nextProps.data) {
            this.slider.set(nextProps.data);
        }
        return false;
    }

    componentDidMount() {
        this.slider = new SliderWidget({
            container: ReactDOM.findDOMNode(this),
            dots: true,
            loop: this.props.loop || true,
            autoLoop: this.props.autoLoop
        });
        this.slider.set(this.props.data);
    }

    render() {
        return <div className={this.props.className} style={this.props.style} />;
    }
}
