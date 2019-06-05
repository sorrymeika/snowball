export function debounce(fn, threshhold) {
    var timer;

    return function () {
        var context = this;
        var args = arguments;

        if (timer) clearTimeout(timer);

        timer = setTimeout(function () {
            fn.apply(context, args);
        }, threshhold);
    };
}
