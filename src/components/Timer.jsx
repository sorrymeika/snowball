import React, { Component } from 'react';


export default class Timer extends Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.startTimer(this.props);
    }

    componentDidMount() {
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps && nextProps.period && nextProps.period !== this.props.period) {
            this.startTimer(nextProps);
        }
    }

    componentWillUnmount() {
        this.stopTimer();
    }

    startTimer(props) {
        this.stopTimer();
        this.timer = setInterval(this.timerTick, 1000);
        this.timerTick();
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    timerTick = () => {
        this.setState({
            now: Date.now()
        });
    }

    render() {
        if (process.env.NODE_ENV != "SNAPSHOT" && !this.timer) {
            return null;
        }
        /**
         * 根据参数计算出到下一个阶段的剩余秒数，并转为00:00:00形式
         * @param {number} systime 当前时间，单位毫秒
         * @param {number} startTime 本阶段的开始时间，单位毫秒
         * @param {number} period 每个阶段的秒数，单位毫秒，如7200000
         */
        let calcLeftTime = function (systime, startTime, period) {
            let countdown;
            if (systime < startTime) {
                countdown = 0;
            } else {
                const diff = systime - startTime;
                countdown = (period - (diff % period)) / 1000;
            }
            return {
                hour: (`0${Math.floor(countdown / 3600)}`).slice(-2),
                minute: (`0${Math.floor(countdown / 60 % 60)}`).slice(-2),
                second: (`0${Math.floor(countdown % 60)}`).slice(-2)
            };
        };
        let { hour, minute, second } = calcLeftTime(Date.now(), this.props.startTime || 1497319200000, (this.props.period || 86400) * 1000);

        return (
            <div className={"timer-count-down " + (this.props.className || '')}>
                <span className='number'>{hour}</span>
                <span className='colon'>{':'}</span>
                <span className='number'>{minute}</span>
                <span className='colon'>{':'}</span>
                <span className='number'>{second}</span>
            </div>
        );
    }
}
