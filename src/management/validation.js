define(function (require, exports, module) {
    var $ = require('jquery');

    var Validation = function (input, options) {
        var me = this;

        options = $.extend({
            left: 0,
            top: 4,
            width: 300,
            emptyAble: true,
            emptyText: null,
            regex: null,
            regexText: null,
            compare: null,
            compareText: null,
            validate: null,
            validateText: null,
            successText: '√',
            position: 'after:this',
            msg: null,
            msgClass: 'msg_tip',
            wrongClass: 'error_tip',
            rightClass: 'right_tip',
            beforeValidate: null,
            onValidate: null
        }, options);

        me._options = options;

        if (typeof input == "string") input = $(input);

        var harbor = $("<span></span>").css({
            position: "absolute",
            top: 0,
            left: 0,
            width: options.width,
            padding: 0,
            margin: 0
        });

        options._tip = $("<span></span>").appendTo(harbor).css({
            position: "absolute",
            top: 0,
            left: 0,
            display: "none",
            "z-index": 1000
        });
        options._input = input;
        options._harbor = harbor;

        var position = options.position.split(':'),
            where = position[0],
            compare = options.compare;

        options._isDock = /^dock/.test(where);
        options._dock = (new Function('return ' + (position[1] || 'this'))).call(input);
        options._where = where;

        options.onValidate && input.on('validate', $.proxy(options.onValidate, me));

        if (compare)
            compare.on('validate', function (e, suc) {
                if (suc && input.val() && this.value != input.val()) {
                    me.error(options.compareText);
                }
            });

        if (input[0].tagName.toLowerCase() == "input" && input[0].type == "file") {
        } else {
            input.focus(function () {
                if (options.beforeValidate) options.beforeValidate.call(me);
                me.hide();
                if (options.msg) me.msg(options.msg);
            })
                .blur(function () {
                    me.hide().validate();
                });
        }
    };
    Validation.prototype = {
        hide: function () {
            this._options._tip.hide();
            return this;
        },
        validate: function (callback) {
            var me = this,
                opt = me._options,
                v = opt._input.val(),
                res = false,
                dfd = {
                    reject: function (msg) {
                        me.error(opt.validationText || msg);
                        callback && callback(false);
                    },
                    resolve: function () {
                        me.success(opt.successText);
                        callback && callback(true);
                    }
                };

            if ((opt.emptyAble === false || ($.isFunction(opt.emptyAble) && !opt.emptyAble())) && (v == "" || v == null))
                me.error(opt.emptyText);
            else if (v != "" && opt.regex !== null && !opt.regex.test(v))
                me.error(opt.regexText);
            else if (opt.compare && opt.compare.val() != v)
                me.error(opt.compareText);
            else if (opt.validate) {
                res = opt.validate.call(me, v, dfd);

                if (res === true)
                    me.success(opt.successText);
                else if (res === false)
                    me.error(opt.validationText);

            } else
                res = true, me.success(opt.successText);

            if (res === true || res === false) {
                callback && callback(res);
                return res;
            }
        },
        msg: function (msg) {
            return this._text(msg);
        },
        success: function (msg) {
            return this._text(msg, true);
        },
        error: function (msg) {
            return this._text(msg, false);
        },
        _text: function (msg, type) {
            var me = this,
                opt = me._options,
                tip = opt._tip,
                harbor = opt._harbor,
                input = opt._input,
                where = opt._where,
                left = opt.left,
                topFix = opt.top,
                dock = opt._isDock ? opt._dock : opt._dock.parent();

            $.inArray(dock.css('position'), ['relative', 'absolute', 'fix']) == -1 && dock.css('position', 'relative');

            harbor.appendTo(dock);

            var pos = input.position();

            if ('bottom' == where) {
                harbor.css({
                    left: pos.left + left,
                    top: pos.top + input.outerHeight() + topFix
                });
            } else if ('dock-bottom' == where) {
                harbor.css({
                    top: '',
                    left: left,
                    bottom: 0 - topFix
                });
            } else if ('dock-top' == where) {
                harbor.css({
                    top: -1 * input.outerHeight() - pos.top,
                    left: left,
                    bottom: 0 - topFix
                });
            } else if ('top' == where) {
                harbor.css({
                    left: pos.left,
                    top: pos.top + topFix
                });
            } else if ('dock-after' == where) {
                harbor.css({
                    left: "",
                    top: ""
                });
            } else
                harbor.css({
                    left: pos.left + input.outerWidth() + left,
                    top: pos.top + topFix
                });

            tip.html(msg || "").show()
                .removeClass([opt.rightClass, opt.msgClass, opt.wrongClass].join(' '))
                .addClass(type === true ? opt.rightClass : type === false ? opt.wrongClass : opt.msgClass);

            (type === true || type === false) && input.trigger('validate', [type, msg]);

            return me;
        }
    };

    var Validations = function (options) {
        var me = this;

        me._list = [];

        if (options)
            $.each(options, function (input, opt) {
                me.add(input, opt);
            });
    };

    Validations.prototype = {
        add: function (input, options) {
            var valid = options ? new Validation(input, options) : input;

            this._list.push(valid);

            return this;
        },
        items: function () {
            var list = this._list,
                args = arguments,
                items = new Validations();

            $.each($.isArray(args[0]) ? args[0] : args, function (i, index) {
                items._list.push(list[index]);
            });

            return items;
        },
        hide: function () {
            $.each(this._list, function (i, item) {
                item.hide();
            });
            return this;
        },
        validate: function (callback) {
            var list = this._list,
                length = list.length - 1,
                result = true,
                immediately,
                isDfd = false,
                dfd = $.Deferred();

            $.each(list, function (i, item) {
                immediately = item.validate(function (flag) {
                    result &= flag;

                    if (length == i) {
                        callback && callback(result === 1);
                        isDfd && dfd[result === 1 ? 'resolve' : 'reject']();
                    }
                });

                if (immediately !== true && immediately !== false) {
                    isDfd = true;
                }
            });

            return isDfd ? dfd : result;
        },
        item: function (i) {
            return this._list[i];
        }
    };

    Validations.Single = Validation;

    module.exports = Validations;
});
