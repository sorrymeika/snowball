import React, { Component } from 'react';

type NumberModifierProps = {
    value: number,
    min?: number,
    max?: number,
    disableMinus: boolean,
    disablePlus: boolean,
    onChange: (value: number) => void,
    onMinusClick?: (value: number) => void,
    onPlusClick?: (value: number) => void,
    onInputClick?: () => void,
    onError?: (type: number, min: number, max: number) => void
};

const ERROR_TYPE = {
    LESS_THAN_MIN: 1,
    MORE_THAN_MAX: 2
};

const BUTTON_TYPE = {
    MINUS: -1,
    PLUS: 1
};

export default class NumberModifier extends Component<NumberModifierProps> {
    static defaultProps = {
        min: 1
    };

    constructor(props) {
        super(props);
        this.setState({
            inputNumber: props.value
        });
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.value != this.state.value) {
            this.setState({
                inputNumber: nextProps.value
            });
        }
    }

    changeValue = (value, type) => {
        const { min, max, onError, onChange } = this.props;
        const { inputNumber } = this.state;

        if (min !== undefined && value < min) {
            value = min;
            onError && onError(ERROR_TYPE.LESS_THAN_MIN, min, max);
            inputNumber != min && onChange && onChange(value);
        }
        else if (max !== undefined && value > max) {
            value = max;
            onError && onError(ERROR_TYPE.MORE_THAN_MAX, min, max);
            inputNumber != max && onChange && onChange(value);
        }
        else {
            onChange && onChange(value);
        }

        this.setState({
            inputNumber: value,
        });
    };

    onInputBlur = e => {
        const value = parseInt(e.target.value, 10) || this.props.min;
        this.changeValue(value);
    };

    onInputChange = e => {
        this.setState({
            inputNumber: parseInt(e.target.value, 10) || ''
        });
    };

    render() {
        const {
            className = '',
            min,
            max,
            disableMinus = false,
            disablePlus = false,
            onPlusClick,
            onMinusClick,
            onInputClick
        } = this.props;
        const { inputNumber = min } = this.state;
        const inputDisabled = disableMinus && disablePlus;

        return (
            <div className={`cm_num__modifier bd_all flex ${className}`}>
                <button
                    className={`minus bd_r ${
                        inputNumber <= min ? 'disabled' : ''
                    }`}
                    onClick={() => {
                        this.changeValue(inputNumber - 1, BUTTON_TYPE.MINUS);
                        onMinusClick && onMinusClick(inputNumber - 1);
                    }}
                    disabled={disableMinus}
                >
                    －
                </button>
                <input
                    disabled={inputDisabled}
                    type="tel"
                    class={inputDisabled ? 'disabled' : ''}
                    value={inputNumber}
                    onChange={this.onInputChange}
                    onBlur={this.onInputBlur}
                    onClick={() => {
                        onInputClick && onInputClick();
                    }}
                />
                <button
                    className={`plus bd_l ${
                        inputNumber == max ? 'disabled' : ''
                    }`}
                    onClick={() => {
                        this.changeValue(inputNumber + 1, BUTTON_TYPE.PLUS);
                        onPlusClick && onPlusClick(inputNumber + 1);
                    }}
                    disabled={disablePlus}
                >
                    ＋
                </button>
            </div>
        );
    }
}
