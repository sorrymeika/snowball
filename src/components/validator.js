define(function (require, exports, module) {
    var $ = require('$');

    var Single = function (options) {
        $.extend(this, options);
    };

    Single.prototype = {
        emptyAble: true,
        emptyText: '不可为空',
        regex: null,
        regexText: null,
        compare: null,
        compareText: '',
        validate: null,
        validateText: null,
        success: '&nbsp;'
    }

    module.exports = exports = function (options, data) {
        var option;
        this.options = {};
        this.data = data;

        for (var key in options) {
            option = options[key];

            this.options[key] = new Single(option);
        }
    };

    exports.KEYS = Object.keys(Single.prototype);

    exports.prototype.each = function (fn) {
        var options = this.options;

        for (var key in options) {
            fn(key, options[key]);
        }
    };

    exports.prototype.set = function (data) {
        this.data = data;
    };

    exports.prototype.valid = function (single, value) {

        if (!single) return { success: true };
        if ((value === '' || value == null) && (single.emptyAble === false || ($.isFunction(single.emptyAble) && !single.emptyAble())))
            return { success: false, msg: single.emptyText };

        else if (value != "" && value != null && single.regex !== null && !single.regex.test(value))
            return { success: false, msg: single.regexText };

        else if (single.compare && this.data[single.compare] != value)
            return { success: false, msg: single.compareText };

        else if (single.validate && !single.validate.call(this, value)) {
            return { success: false, msg: single.validateText };

        } else
            return { success: true, msg: typeof single.success == 'function' ? single.success.call(this, value) : single.success };
    };

    exports.prototype.validate = function (keys) {
        var attrs,
            single,
            options = this.options,
            data = this.data;

        if (typeof keys == 'string') {

            return this.valid(options[keys], data[keys]);
        } else {

            var res,
                key,
                result = {
                    success: true,
                    result: {}
                };

            if (!Array.isArray(keys)) {
                keys = Object.keys(options);
            }

            for (var i = 0, length = keys.length; i < length; i++) {
                key = keys[i];

                res = this.valid(options[key], data[key]);
                result.result[key] = res;

                if (result.success) result.success &= res.success;
            }

            return result;
        }
    }
});
