import React from 'react';
import { splitTime, isFunction } from '../utils';
import { util } from '../snowball';

type Props = {
    endTime: number,
    onCountDownEnd: () => void
};

const defaultRenderCountDown = props => {
    const { days, hours, minutes, seconds } = props;
    return (
        <span>
            {days}天${hours}小时${minutes}分${seconds}秒
        </span>
    );
};

var tasks = [];
var intervalId;

function startCountDown(fn) {
    if (tasks.length == 0) {
        intervalId = setInterval(() => {
            for (const task of tasks) {
                if (isFunction(task)) {
                    task();
                }
            }
        }, 1000);
    }
    if (isFunction(fn)) {
        fn();
    }
    tasks.push(fn);
}

function stopCountDown(fn) {
    for (let i = 0; i < tasks.length; i++) {
        if (tasks[i] == fn) {
            tasks.splice(i, 1);
        }
    }

    if (!tasks.length && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

class CountDown extends React.Component<Props, any> {
    static defaultProps = {
        endTime: 0,
        onCountDownEnd: () => { }
    }

    constructor(props) {
        super(props);

        this.state = {
            time: {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0
            }
        };
        this.countDown = null;
    }

    componentDidMount() {
        this.startCountDown();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.endTime !== this.props.endTime) {
            this.startCountDown(nextProps);
        }
    }

    componentWillUnmount() {
        this.stop();
    }

    generateCountDown = (props) => {
        return () => {
            const { endTime, onCountDownEnd } = props || this.props;
            let duration = endTime - util.getCurrentTime();

            if (duration <= 0) {
                duration = 0;
                this.stop();
                if (isFunction(onCountDownEnd)) {
                    onCountDownEnd();
                }
            }
            this.setState({
                time: splitTime(duration)
            });
        };
    }

    startCountDown = (props) => {
        const { endTime } = props || this.props;

        if (endTime <= util.getCurrentTime()) {
            return;
        }

        if (this.countDown) {
            this.stop();
        }

        this.countDown = this.generateCountDown(props);
        startCountDown(this.countDown);
    }

    stop = () => {
        stopCountDown(this.countDown);
        this.countDown = null;
    }

    render() {
        const { time } = this.state;
        const { children } = this.props;
        const renderCountDown = children || defaultRenderCountDown;

        return renderCountDown(time);
    }
}

export default CountDown;