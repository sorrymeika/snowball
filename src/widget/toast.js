import { $ } from '../core/dom';

var promise = Promise.resolve();
var timer;
var $el = $('<div class="toast" style="display:none"></div>')
    .on($.fx.transitionEnd, function () {
        if ($el.hasClass('toast-hide')) {
            $el.hide();
            timer && clearTimeout(timer);
            timer = null;
        }
    })
    .appendTo(document.body);

const Toast = {
    msec: 2000,

    show() {
        if (!$el.hasClass('toast-show'))
            $el.removeClass('toast-hide')
                .show()
                .addClass('toast-show');
    },

    msg(msg) {
        promise = promise.then(() => {
            return new Promise((resolve, reject) => {
                $el.html(msg);
                this.show();

                timer && clearTimeout(timer);
                timer = null;

                setTimeout(() => {
                    this.hide(resolve);
                    resolve();
                }, this.msec);
            });
        });
    },

    hide() {
        $el.removeClass('toast-show').addClass('toast-hide');
        timer = setTimeout(() => {
            $el.hide();
        }, 400);
    }
};

function showToast(msg) {
    Toast.msg(msg);
}

export default { showToast };