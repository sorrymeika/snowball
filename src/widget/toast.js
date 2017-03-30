
var $ = require('$'),
    util = require('util'),
    Promise = require('promise');

var $el = $('<div class="tip" style="display:none"></div>')
    .on($.fx.transitionEnd, function () {
        if ($el.hasClass('tip-hide')) {
            $el.hide();
        }
    })
    .appendTo(document.body),
    timer;

var promise = Promise.resolve();

exports.msec = 2000;

exports.show = function () {
    if (!$el.hasClass('tip-show'))
        $el.removeClass('tip-hide').show().addClass('tip-show');
}

exports.msg = function (msg) {
    var self = this;

    promise = promise.then(function () {
        $el.html(msg);
        self.show();

        return new Promise(function (resolve) {
            setTimeout(function () {

                self.hide();

                resolve();

            }, self.msec);

        })
    })
}

exports.hide = function () {
    $el.removeClass('tip-show').addClass('tip-hide');
}

exports.showToast = function (msg) {
    exports.msg(msg);
};