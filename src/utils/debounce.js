export function debounce(fn, threshhold) {
    var timer;

    var method = function () {
        var context = this;
        var args = arguments;

        if (timer) clearTimeout(timer);

        timer = setTimeout(function () {
            fn.apply(context, args);
        }, threshhold);
    };

    method.clear = function () {
        if (timer) clearTimeout(timer);
    };

    return method;
}
