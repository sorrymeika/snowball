
var rAF = window.requestAnimationFrame;
var cAF = window.cancelAnimationFrame;

if (!rAF) {
    var vendors = ['webkit'/* ,'moz','o','ms'*/];
    for (var x = 0; !rAF && x < vendors.length; ++x) {
        rAF = window[vendors[x] + 'RequestAnimationFrame'];
        cAF = window[vendors[x] + 'CancelAnimationFrame'] ||
            window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!rAF) {
        var lastTime = 0;
        rAF = function (callback) {
            var now = Date.now();
            var time = Math.max(0, 16.7 - (now - lastTime));
            var id = setTimeout(function () {
                callback(now + time);
            }, time);

            lastTime = now + time;
            return id;
        };
        cAF = function (id) {
            clearTimeout(id);
        };
    }

    window.requestAnimationFrame = rAF;
    window.cancelAnimationFrame = cAF;
}

export default rAF;
export { rAF, cAF };
