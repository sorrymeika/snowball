import LinkList from "../libs/linklist";
import { $, reflow } from '../utils';
import rAF from '../core/rAF';

import Matrix2D from "./Matrix2D";
import tween from "./tween";
import CubicBezier from "./CubicBezier";

const DEFAULT_TRANSITION = {
    openEnterZIndex: 2,
    closeEnterZIndex: 1,
    openExitZIndex: 1,
    closeExitZIndex: 3,
    openEnterAnimationFrom: {
        translate: '99%,0%'
    },
    openEnterAnimationTo: {
        translate: '0%,0%'
    },
    openExitAnimationFrom: {
        translate: '0%,0%'
    },
    openExitAnimationTo: {
        translate: '-50%,0%'
    },
    closeEnterAnimationTo: {
        translate: '0%,0%'
    },
    closeEnterAnimationFrom: {
        translate: '-50%,0%'
    },
    closeExitAnimationFrom: {
        translate: '0%,0%'
    },
    closeExitAnimationTo: {
        translate: '100%,0%'
    }
};

export function getTransition(isForward, animConfig) {
    animConfig = {
        ...DEFAULT_TRANSITION,
        ...animConfig
    };
    const type = isForward ? "open" : "close",
        enterFrom = Object.assign({}, animConfig[type + 'EnterAnimationFrom']),
        exitFrom = Object.assign({}, animConfig[type + 'ExitAnimationFrom']);

    enterFrom.zIndex = isForward ? animConfig.openEnterZIndex : animConfig.closeEnterZIndex;
    enterFrom.display = 'block';
    exitFrom.zIndex = isForward ? animConfig.openExitZIndex : animConfig.closeExitZIndex;
    exitFrom.display = 'block';

    return {
        enterFrom,
        enterTo: animConfig[type + 'EnterAnimationTo'],
        exitFrom: exitFrom,
        exitTo: animConfig[type + 'ExitAnimationTo']
    };
}

const TRANSFORM = $.fx.cssPrefix + 'transform';
const eachAccessor = (data, fn) => {
    for (let key in data) {
        fn(key, data[key]);
    }
};

const list = new LinkList();
const defaultStyle = {
    opacity: 1
};

const PERCENT_RE = /(\d+\.\d+|\d+)%/g;
const TRANSLATE_STYLE_RE = /translate\((-?\d+(?:\.\d+)?(?:%|px)?)\s*,\s*(-?\d+(?:\.\d+)?(?:%|px)?)\)/;
const MATRIX_STYLE_RE = /matrix\((-?\d+\.\d+|-?\d+)\s*,\s*(-?\d+\.\d+|-?\d+)\s*,\s*(-?\d+\.\d+|-?\d+)\s*,\s*(-?\d+\.\d+|-?\d+)\s*,\s*(-?\d+\.\d+|-?\d+)\s*,\s*(-?\d+\.\d+|-?\d+)\s*\)/;
const LAST_MATRIX_STYLE_RE = /matrix\([^)]+\)\s*$/;
const MATRIX_FUNC_RE = /(translate|skew|rotate|scale|matrix)(3d)?\(([^)]+)\)/g;
const TRANSFORM_FUNC_RE = /^(matrix|translate|skew|rotate|scale|invert)(3d)?$/;

function toFloatArray(arr) {
    return arr.map(function (item) {
        item = parseFloat(item);
        return isNaN(item) ? 0 : item;
    });
}

/**
 * 获取当前动画进行到的位置
 *
 * @param {Number} from 开始位置
 * @param {Number} end 结束为止
 * @param {Number} progress 当前进度(百分比)
 */
export function computeFrame(from, end, progress) {
    return parseFloat(from) + (parseFloat(end) - parseFloat(from)) * progress;
}

export function toMatrix(cssText) {
    var matrix = new Matrix2D();
    cssText.replace(MATRIX_FUNC_RE, function ($0, funcName, is3d, val) {
        matrix[funcName == 'matrix' ? 'append' : funcName].apply(matrix, toFloatArray(val.split(',')));
    });
    return matrix;
}

export function castStyle(css) {
    var result = {},
        origTransform,
        matrix;

    eachAccessor(css, function (key, val) {
        var m = key.match(TRANSFORM_FUNC_RE);
        if (m) {
            if (key === 'translate') {
                val = (result[TRANSFORM] || '') + ' ' + key + '(' + val + ') translateZ(0)';
            } else {
                if (!matrix) matrix = new Matrix2D();
                origTransform = (result[TRANSFORM] || '');
                val = matrix[key == 'matrix' ? 'append' : key].apply(matrix, toFloatArray(val.split(','))).toString();
                val = LAST_MATRIX_STYLE_RE.test(origTransform) ? origTransform.replace(LAST_MATRIX_STYLE_RE, val) : (origTransform + ' ' + val);
            }
            key = TRANSFORM;
        } else if (key === 'transform') {
            key = TRANSFORM;
            matrix = toMatrix(val);
        }
        result[key] = val;
    });

    return result;
}

export { reflow };

$.fn.transform = function (css) {
    this.css(castStyle(css));
    return this;
};

$.fn.matrix = function (matrix) {
    if (matrix instanceof Matrix2D) {
        this.css(TRANSFORM, matrix.toString());
        return this;
    } else
        return toMatrix(getComputedStyle(this[0], null)[TRANSFORM]);
};

function init(item) {
    var ease = item.ease;

    item.startTime = Date.now();

    (!ease
        && (item.ease = tween.easeOut))
        || (typeof ease == "string" && (item.ease = ease.indexOf('cubic-bezier') == 0
            ? new CubicBezier(ease)
            : tween[ease.replace(/\-([a-z])/g, function ($0, $1) {
                return $1.toUpperCase();
            })]));

    item.stop = function () {
        list.remove(item);
    };
    if (item.from === undefined) item.from = 0;
    if (item.to === undefined) item.to = 100;
    if (!item.duration) item.duration = 300;

    return item;
}

let isAnimationStop = true;

function run() {
    if (list.length) {
        isAnimationStop = false;

        var timeUse,
            item = list._idlePrev,
            nextItem,
            first;

        while (item && item != list) {
            nextItem = item._idlePrev;
            first = item.data;
            timeUse = Date.now() - first.startTime;

            if (timeUse <= first.duration) {
                first.step(first.ease instanceof CubicBezier ? first.ease.get(timeUse / first.duration) : first.ease(timeUse, first.from, first.to - first.from, first.duration) / 100, timeUse, first.duration);
            } else {
                first.step(first.to / 100, first.duration, first.duration);
                list._remove(item);
                first.finish && first.finish(first.to / 100);
            }

            item = nextItem;
        }

        rAF(run);
    } else {
        isAnimationStop = true;
    }
}

function parallelAnimate(animations) {
    for (var i = 0, n = animations.length; i < n; i++) {
        list.append(init(animations[i]));
    }

    if (isAnimationStop) run();
}

function eachFrame(d) {
    var style,
        originStyle,
        originVal,
        val,
        newStyle;

    this.el.each(function () {
        style = this._animationStyle;
        originStyle = this._originStyle;

        if (d == 0) {
            newStyle = originStyle;
        } else if (d < 1) {
            newStyle = {};

            for (var key in style) {
                val = style[key];
                originVal = originStyle[key];

                if (key == TRANSFORM) {
                    var m = originVal.match(MATRIX_STYLE_RE) || ['', 1, 0, 0, 1, 0, 0];
                    var matrix = toMatrix(val);

                    matrix.a = computeFrame(m[1], matrix.a, d);
                    matrix.b = computeFrame(m[2], matrix.b, d);
                    matrix.c = computeFrame(m[3], matrix.c, d);
                    matrix.d = computeFrame(m[4], matrix.d, d);
                    matrix.tx = computeFrame(m[5], matrix.tx, d);
                    matrix.ty = computeFrame(m[6], matrix.ty, d);

                    newStyle[key] = matrix.toString() + ' translateZ(0)';
                } else if (!isNaN(parseFloat(val))) {
                    originVal = parseFloat(originVal);
                    if (isNaN(originVal)) originVal = defaultStyle[key] || 0;

                    newStyle[key] = computeFrame(originVal, val, d);
                } else {
                    newStyle[key] = val;
                }
            }
        } else {
            newStyle = style;
        }

        $(this).css(newStyle);
    });

    this._step && this._step(d);
}

function animationFinish(per) {
    if (per == 1) this.el.css(this.css);
    this._finish && this._finish(per);
}

function prepare(animations) {

    animations.forEach(function (item) {
        if (!item.css) return;

        var $el = item.el = $(item.el);

        item.css = castStyle(item.css);

        if (item.start) {
            $el.transform(item.start);
        }

        $el.each(function () {
            var el = this;
            var animationStyle = {};
            var originStyle = {};
            var style = getComputedStyle(el, null);

            eachAccessor(item.css, function (key, val) {
                if (typeof val === 'string') {
                    if (key == TRANSFORM) {
                        val = val
                            .replace(TRANSLATE_STYLE_RE, function ($0, $1, $2) {
                                return 'translate('
                                    + (
                                        $1.slice(-1) === '%'
                                            ? el.offsetWidth * parseFloat($1) / 100
                                            : parseFloat($1)
                                    ) + 'px,'
                                    + (
                                        $2.slice(-1) === '%' ?
                                            el.offsetHeight * parseFloat($2) / 100 :
                                            parseFloat($2)
                                    ) + 'px)';
                            });
                    } else if (/^(top|margin(-t|T)op)$/.test(key)) {
                        val = val.replace(PERCENT_RE, function ($0) {
                            return el.parentNode.offsetHeight * parseFloat($0) / 100 + "px";
                        });
                    } else if (/^(left|margin(-l|L)eft|padding(-l|L)eft|padding(-t|T)op)$/.test(key)) {
                        val = val.replace(PERCENT_RE, function ($0) {
                            return el.parentNode.offsetWidth * parseFloat($0) / 100 + "px";
                        });
                    }
                }

                originStyle[key] = style[key];
                animationStyle[key] = val;
            });

            el._animationStyle = animationStyle;
            el._originStyle = originStyle;
        });

        item._step = item.step;
        item.step = eachFrame;

        item._finish = item.finish;
        item.finish = animationFinish;
    });

    return animations;
}

export class Animation {

    constructor(animations) {
        if (!Array.isArray(animations)) animations = [animations];
        prepare(animations);
        this.list = animations;
    }

    progress(percent) {
        var item,
            list = this.list;

        this.per = percent;

        for (var i = 0, length = list.length; i < length; i++) {
            item = list[i];
            item.from = percent;
            item.step(percent / 100);
        }
        return this;
    }

    animate(duration, percent, callback) {
        var item,
            animations = this.list;

        for (var i = 0, length = animations.length; i < length; i++) {
            item = animations[i];
            item.duration = duration;
            item.to = percent;
            item.finish = item.start = undefined;
        }

        item.finish = callback;

        parallelAnimate(animations);
        return this;
    }
}


/**
 * 并行执行动画
 *
 * @param {Object[]} animations
 * @param {Element|Zepto} animations[].el
 * @param {Object} animations[].css
 * @param {Object} [animations[].start]
 * @param {Function} animations[].finish
 */
export function parallel(animations) {
    parallelAnimate(prepare(animations));
}

/**
 * 执行动画
 * @param {Element} [el] DOM元素
 * @param {Object} [css] DOM样式，不支持transform3d
 * @param {Function} [step] 帧处理函数
 * @param {Number} duration 持续事件
 * @param {String} ease tween动画
 * @param {Function} finish 动画结束回调函数
 * @example
 * // for dom
 * animate(document.getElementById('id'), {
 *   height: 100,
 *   width: 50,
 *   translate: '50%, 20%'
 * }, 200, 'ease-out', ()=> {})
 *
 * // use step function
 * animate((progress)=>{
 *   document.getElementById('id').style.height = computeFrame(heightFrom, heightTo, progress) + 'px';
 * }, 200, 'ease-out')
 */
export function animate(...args) {
    var item = {},
        i = 0,
        el = args[i++];

    if (typeof el === 'function') {
        item.step = el;
    } else {
        item.el = el;
        item.css = args[i++];
    }
    item.duration = args[i++];
    item.ease = args[i++];
    item.finish = args[i];

    parallelAnimate([item]);

    return item;
}