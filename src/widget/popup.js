var $ = require('$');
var Promise = require('promise');

var $mask = $('<div class="cp_popup__mask"></div>').appendTo('body');

$mask.on($.fx.transitionEnd, function () {

    if (!$(this).hasClass('show')) {
        this.style.display = 'none';
    }
});

function showMask() {
    $mask.show()[0].clientHeight;
    $mask.addClass('show');
}

var popupPromise = Promise.resolve();
var popups = [];

module.exports = {

    //@params={title: '结束咨询',content: '您是否确认结束本次咨询?',btn: '确定',action: function(){} }
    alert: function (params) {

        params = Object.assign({
            title: "温馨提醒",
            btn: '确定',
            action: function () { }
        }, params)

        var content = '<div class="cp_popup__title">' + params.title + '</div>\
        <div class="cp_popup__desc">'+ params.content + '</div>\
        <div class="cp_popup__action"><button class="btn" click="action">'+ params.btn + '</button></div>';

        return this.popup({
            className: params.className,
            content: content,
            action: function () {
                this.hide();
                params.action.call(this);
            }
        })
    },

    //@params={title: '结束咨询',content: '您是否确认结束本次咨询?', cancelAction: function(){}, cancelText: '继续咨询', confirmAction: function(){}, confirmText: '结束咨询' }
    confirm: function (params) {

        params = Object.assign({
            title: "温馨提醒",
            confirmText: '确定',
            cancelText: '取消',
            cancelAction: function () { }
        }, params)

        var content = '<div class="cp_popup__title">' + params.title + '</div>\
        <div class="cp_popup__desc">'+ params.content + '</div>\
        <div class="cp_popup__action"><button class="btn btn_cancel" click="cancelAction">'+ params.cancelText + '</button><button class="btn" click="confirmAction">' + params.confirmText + '</button></div>';

        return this.popup({
            content: content,
            confirmAction: params.confirmAction,
            cancelAction: function () {
                this.hide();
                params.cancelAction.call(this);
            }
        })
    },

    //@params={ title: '给医生的回答打下分吧', placeholder: '我想要说几句', maxLength: 100, cancelText: '取消', confirmAction: function(){}, confirmText: '确认' }
    prompt: function (params) {

        var content = '<div class="cp_popup__title">' + params.title + '</div>\
        <div class="cp_popup__desc"><input class="cp_popup__input" placeholder="'+ params.placeholder + '"></div>\
        <div class="cp_popup__action"><button class="btn btn_cancel" click="cancelAction">'+ params.cancelText + '</button><button class="btn" click="confirmAction">' + params.confirmText + '</button></div>';

        return this.popup({
            content: content,
            confirmAction: function () {
                var value = this.find('.cp_popup__input').val();

                params.confirmAction.call(this, value);
            },
            cancelAction: function () {
                this.hide();
                params.cancelAction.call(this);
            }
        })

    },

    //@params={ options: [{ text: 'xxx', click: function(){} }] }
    options: function (params) {
        var options = params.options;
        var content = '';

        var popupParams = {
            className: 'cp_popup__up cp_popup__options',
            tapMaskToHide: true,
            onHide: params.onHide
        };

        options.forEach(function (item, i) {
            var click = '';
            if (typeof item.click === 'function') {
                popupParams["optionClick" + i] = item.click;
                click = ' click="optionClick' + i + '"';
            }

            content += '<div class="cp_popup__option"' + click + '>' + item.text + '</div>';
        })

        popupParams.content = content;

        return this.popup(popupParams)
    },

    //@params={ className: xxx, content: "<div>asdfaf</div>" }
    up: function (params) {
        if (params.className) params.className += ' cp_popup__up';

        return this.popup(Object.assign({
            tapMaskToHide: true,
            className: "cp_popup__up"

        }, params))
    },

    //@params={ className: 'xxx', content:'内容<button click="confirm"></button>',initialize:function(){},confirm:function(){}}
    popup: function (params) {
        var $container;
        var prevPromise = popupPromise;
        var resolveSelf;
        var ret = {

            find: function (selector) {
                return $container.find(selector)
            },

            show: function () {

                $container.addClass('show');
                $mask.addClass('show');
            },

            hide: function () {

                var ret = this;

                prevPromise.then(function () {

                    params.onHide && params.onHide();
                    params.tapMaskToHide && $mask.off('tap', ret.hide);

                    (popups.length <= 1) && $mask.removeClass('show');
                    $container.removeClass('show');

                    setTimeout(function () {
                        if (!$container.hasClass('show')) {
                            $container[0].parentNode && $container.remove();
                        }
                        if (!$mask.hasClass('show')) {
                            $mask[0].style.display = 'none';
                        }
                    }, 500);

                    for (var i = popups.length; i >= 0; i--) {
                        if (popups[i] == ret) {
                            popups.splice(i, 1);
                            break;
                        }
                    }
                    resolveSelf();
                })
            }
        };

        popupPromise = prevPromise.then(function () {

            return new Promise(function (resolve, reject) {
                resolveSelf = resolve;

                $container = $('<div class="cp_popup__container' + (params.className ? ' ' + params.className : '') + '"></div>')
                    .on($.fx.transitionEnd, function () {
                        if (!$(this).hasClass('show')) {
                            this.parentNode && this.parentNode.removeChild(this);
                        }
                    })
                    .on('tap', '[click]', function (e) {

                        var actionName = $(e.currentTarget).attr('click');

                        params[actionName].call(ret, e);

                        if ((params.type == 'alert' && actionName == 'action') || actionName == 'cancelAction') {
                            ret.hide();
                        }
                    });

                if (params.tapToHide === true) {
                    $container.on('tap', function () {
                        ret.hide();
                    })
                }

                $container.append(params.content);

                $container.appendTo('body');

                showMask();
                $container.addClass('show');

                if (params.tapMaskToHide) {
                    $mask.one('tap', $.proxy(ret.hide, ret));
                }

                popups.push(ret);
            });
        });

        return ret;
    },

    hidePopup: function () {
        if (popups.length) popups.pop().hide();
    },

    hideAllPopups: function () {

        if (popups.length) {
            $mask.removeClass('show');
            $('.cp_popup__container').removeClass('show');
            popups.length = 0;
            popupPromise = Promise.resolve();
        }
    }

};
