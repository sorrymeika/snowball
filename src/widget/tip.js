
var $ = require('$'),
    util = require('util'),
    Queue = require('core/queue');

var $el = $('<div class="tip" style="display:none"></div>')
    .on($.fx.transitionEnd, function () {
        if ($el.hasClass('tip-hide')) {
            $el.hide();
        }
    })
    .appendTo(document.body),
    timer;

var queue = Queue.done();

exports.msec = 2000;

exports.show = function () {
    if (!$el.hasClass('tip-show'))
        $el.removeClass('tip-hide').show().addClass('tip-show');
}

exports.msg = function (msg) {
    var self = this;

    queue.push(function (err, res, next) {
        $el.html(msg);
        self.show();

        setTimeout(function () {

            self.hide();

            next();

        }, self.msec);
    })
}

exports.hide = function () {
    $el.removeClass('tip-show').addClass('tip-hide');
}

sl.tip = function (msg) {
    exports.msg(msg);
};