var $ = require("$");
var LinkList = require("./linklist");
var Matrix2D = require("graphics/matrix2d");
var tween = require("graphics/tween");
var CubicBezier = require("graphics/cubicBezier");
var util = require("util");

var TRANSFORM = $.fx.cssPrefix + 'transform';

var list = new LinkList();
var animationStop = true;
var defaultStyle = {
    opacity: 1
};

var percentRE = /(\d+\.\d+|\d+)%/g;
var translatePercentRE = /translate\((\-?\d+(?:\.\d+)?(?:%|px)?)\s*,\s*(\-?\d+(?:\.\d+)?(?:%|px)?)\)/;
var matrixRE = /matrix\((\-?\d+\.\d+|\-?\d+)\s*,\s*(\-?\d+\.\d+|\-?\d+)\s*,\s*(\-?\d+\.\d+|\-?\d+)\s*,\s*(\-?\d+\.\d+|\-?\d+)\s*,\s*(\-?\d+\.\d+|\-?\d+)\s*,\s*(\-?\d+\.\d+|\-?\d+)\s*\)/;
var matrixEndRE = /matrix\([^\)]+\)\s*$/;

var transformAllRE = /(translate|skew|rotate|scale|matrix)(3d)?\(([^\)]+)\)/g;
var transformRE = /^(matrix|translate|skew|rotate|scale|invert)(3d)?$/;


function toFloatArray(arr) {
    return arr.map(function (item, i) {
        item = parseFloat(item);

        return isNaN(item) ? 0 : item;
    });
}

/**
 * 获取当前动画进行到的位置
 * 
 * @param {Number} from 开始位置
 * @param {Number} end 结束为止
 * @param {Number} d 当前位置百分比
 */
function getCurrent(from, end, d) {
    return parseFloat(from) + (parseFloat(end) - parseFloat(from)) * d;
}

exports.step = getCurrent;


function getMatrixByTransform(transform) {
    var matrix = new Matrix2D();
    transform.replace(transformAllRE, function ($0, $1, is3d, $2) {
        matrix[$1 == 'matrix' ? 'append' : $1].apply(matrix, toFloatArray($2.split(',')));
    });

    return matrix;
}

function toTransform(css) {
    var result = {},
        origTransform,
        matrix;

    $.each(css, function (key, val) {
        var m = key.match(transformRE);
        if (m) {
            if (key === 'translate') {
                val = (result[TRANSFORM] || '') + ' ' + key + '(' + val + ') translateZ(0)';

            } else {
                if (!matrix) matrix = new Matrix2D();
                origTransform = (result[TRANSFORM] || '');
                val = matrix[key == 'matrix' ? 'append' : key].apply(matrix, toFloatArray(val.split(','))).toString();
                val = matrixEndRE.test(origTransform) ? origTransform.replace(matrixEndRE, val) : (origTransform + ' ' + val);
            }
            key = TRANSFORM;

        } else if (key === 'transform') {
            key = TRANSFORM;
            matrix = null;
        }
        result[key] = val;
    });

    return { css: result, matrix: matrix };
};

$.fn.transform = function (css) {
    this.css(toTransform(css).css);

    return this;
};

$.fn.matrix = function (matrix) {
    if (matrix instanceof Matrix2D) {
        this.css(TRANSFORM, matrix.toString());

        return this;
    } else
        return getMatrixByTransform(getComputedStyle(this[0], null)[TRANSFORM]);
};

exports.transform = toTransform;

function init(item) {
    var ease = item.ease;

    item.startTime = Date.now();

    !ease && (item.ease = tween.easeOut) || (typeof ease == "string") && (item.ease = ease.indexOf('cubic-bezier') == 0 ? new CubicBezier(ease) : tween[ease.replace(/\-([a-z])/g, function ($0, $1) {
        return $1.toUpperCase();
    })]);

    item.stop = function () {
        list.remove(item);
    };
    if (item.from === undefined) item.from = 0;
    if (item.to === undefined) item.to = 100;
    if (!item.duration) item.duration = 300;

    return item;
}

function run() {
    if (list.length) {
        animationStop = false;

        var timeUse,
            arr,
            flag = false,
            startTime = +new Date,
            item = list._idlePrev,
            nextItem,
            first;

        while (item && item != list) {
            nextItem = item._idlePrev;
            first = item.data;

            timeUse = Date.now() - first.startTime;
            arr = [];

            if (timeUse <= first.duration) {

                first.step(first.ease instanceof CubicBezier ? first.ease.get(timeUse / first.duration) : first.ease(timeUse, first.from, first.to - first.from, first.duration) / 100, timeUse, first.duration);

            } else {
                first.step(first.to / 100, first.duration, first.duration);

                list._remove(item);

                first.finish && first.finish(first.to / 100);
            }

            item = nextItem;
        }

        requestAnimationFrame(run);
    } else {
        animationStop = true;
    }
}

function parallel(animations) {
    for (var i = 0, n = animations.length, item; i < n; i++) {
        list.append(init(animations[i]));
    }

    if (animationStop) run();
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
                    var m = originVal.match(matrixRE) || ['', 1, 0, 0, 1, 0, 0];
                    var i = 0;
                    var matrix = getMatrixByTransform(val);

                    for (var i = 0; i < 6; i++) {
                        matrix[i] = getCurrent(m[i + 1], matrix[i], d);
                    }
                    newStyle[key] = matrix.toString() + ' translateZ(0)';

                } else if (!isNaN(parseFloat(val))) {

                    originVal = parseFloat(originVal);
                    if (isNaN(originVal)) originVal = defaultStyle[key] || 0;

                    newStyle[key] = getCurrent(originVal, val, d);

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

    for (var i = 0, n = animations.length; i < n; i++) {
        var item = animations[i];

        if (!item.css) continue;

        var $el = item.el = $(item.el);
        var css = toTransform(item.css);

        item.matrix = css.matrix;
        item.css = css.css;

        if (typeof item.start === 'object') {
            $el.transform(item.start);
        }

        $el.each(function () {
            var el = this;
            var animationStyle = {};
            var originStyle = {};
            var style = getComputedStyle(el, null);

            $.each(item.css, function (key, val) {
                if (typeof val === 'string') {
                    if (key == TRANSFORM) {
                        val = val.replace(translatePercentRE, function ($0, $1, $2) {

                            return 'translate(' + ($1.slice(-1) === '%' ?
                                el.offsetWidth * parseFloat($1) / 100 :
                                parseFloat($1)) + 'px,'
                                + (
                                    $2.slice(-1) === '%' ?
                                        el.offsetHeight * parseFloat($2) / 100 :
                                        parseFloat($2)

                                ) + 'px)';
                        });

                    } else if (/^(top|margin(-t|T)op)$/.test(key)) {
                        val = val.replace(percentRE, function ($0) {
                            return el.parentNode.offsetHeight * parseFloat($0) / 100 + "px";
                        });

                    } else if (/^(left|margin(-l|L)eft|padding(-l|L)eft|padding(-t|T)op)$/.test(key)) {
                        val = val.replace(percentRE, function ($0) {
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
    }

    return animations;
}

function Animation(animations) {
    if (!$.isArray(animations)) animations = [animations];

    prepare(animations);

    this.list = animations;
}

Animation.prototype.step = function (percent) {
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

Animation.prototype.animate = function (duration, percent, callback) {
    var item,
        animations = this.list;

    for (var i = 0, length = animations.length; i < length; i++) {
        item = animations[i];
        item.duration = duration;
        item.to = percent;
        item.finish = item.start = undefined;
    }

    item.finish = callback;

    parallel(animations);

    return this;
}

exports.Animation = Animation;

/**
 * 并行执行动画
 * 
 * @param {Object[]} animations
 * @param {Element|Zepto} animations[].el
 * @param {Object} animations[].css
 * @param {Object} [animations[].start]
 * @param {Function} animations[].finish
 */
exports.parallel = function (animations) {
    parallel(prepare(animations));
};

/**
 * 执行动画
 * [el, css] | [step]
 * 
 * @param {Element} [el]
 * @param {Object} [css]
 * @param {Function} [step] 
 * @param {Number} duration
 * @param {String} ease
 * @param {Function} finish
 */
exports.animate = function () {
    var args = arguments,
        item = {},
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

    parallel([item]);

    return item;
};
