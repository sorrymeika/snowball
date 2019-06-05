/**
 * 节流函数
 * @param {Function} fn
 * @param {Number} wait 阈值
 * @param {Object} options 选项
 * @param {Boolean} options.leading 首次是否执行 默认为 true
 * @param {Boolean} options.trailing 结束后是否再执行一次 默认为 true
 */

export function throttle(
    fn,
    wait = 300,
    options
) {
    var context, args, result;
    var timeout = null;
    var previous = 0;

    if (!options) {
        options = {};
    }

    var later = function () {
        previous = options.leading === false ? 0 : +new Date();
        timeout = null;
        result = fn.apply(context, args);
        if (!timeout) {
            context = args = null;
        }
    };

    var throttled = function () {
        var now = +new Date();
        if (!previous && options.leading === false) {
            previous = now;
        }
        // 计算剩余时间
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = fn.apply(context, args);
            if (!timeout) {
                context = args = null;
            }
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };

    return throttled;
}
