import { $ } from '../utils';

var promise = Promise.resolve();
var timer;
var $el = $('<div class="app-toast" style="display:none"></div>')
    .on($.fx.transitionEnd, function () {
        if ($el.hasClass('app-toast-hide')) {
            $el.hide();
            timer && clearTimeout(timer);
            timer = null;
        }
    })
    .appendTo(document.body);

const Toast = {
    msec: 2000,

    show() {
        if (!$el.hasClass('app-toast-show'))
            $el.removeClass('app-toast-hide')
                .show()
                .addClass('app-toast-show');
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
        $el.removeClass('app-toast-show').addClass('app-toast-hide');
        timer = setTimeout(() => {
            $el.hide();
        }, 400);
    }
};

function showToast(msg) {
    Toast.msg(msg);
}

export default { showToast };