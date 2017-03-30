var ArrayProto = Array.prototype,
    slice = ArrayProto.slice,
    concat = ArrayProto.concat,
    guid = 0;

var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

var Util = {
    guid: function () {
        return ++guid;
    },

    joinPath: function () {
        var args = [].slice.apply(arguments);
        var result = args.join('/').replace(/[\\]+/g, '/').replace(/([^\:\/]|^)[\/]{2,}/g, '$1/').replace(/([^\.]|^)\.\//g, '$1');
        var flag = true;
        while (flag) {
            flag = false;
            result = result.replace(/([^\/]+)\/\.\.(\/|$)/g, function (match, name) {
                if (name == '..') return match;
                if (!flag) flag = true;
                return '';
            })
        }
        return result.replace(/\/$/, '');
    },

    random: function (min, max) {
        if (max == null) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    },

    randomString: function (len) {
        var chars = CHARS, uuid = '', rnd = 0, r;
        for (var i = 0; i < len; i++) {
            if (i == 8 || i == 13 || i == 18 || i == 23) {
                uuid += '-';
            } else if (i == 14) {
                uuid += '4';
            } else {
                if (rnd <= 0x02) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
                r = rnd & 0xf;
                rnd = rnd >> 4;
                uuid += chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
        return uuid;
    },

    uuid: function () {
        return this.randomString(36);
    },

    indexOf: function (arr, key, val) {
        if (typeof key === 'string' && val !== undefined) {
            var compare = val;
            val = function (item) {
                return item[key] == compare;
            }
        }
        else val = key;

        var isFn = typeof val === 'function';
        var length = arr.length;

        for (var i = 0; i < length; i++) {
            if (isFn ? val(arr[i], i) : (arr[i] == val)) return i;
        }
        return -1;
    },

    lastIndexOf: function (arr, key, val) {
        if (typeof key === 'string' && val !== undefined) {
            var compare = val;
            val = function (item) {
                return item[key] == compare;
            }
        }
        else val = key;

        var isFn = typeof val === 'function';
        for (var i = arr.length - 1; i >= 0; i--) {
            if (isFn ? val(arr[i], i) : (arr[i] == val)) return i;
        }
        return -1;
    },

    first: function (arr, fn) {
        var item;

        for (var i = 0, len = arr.length; i < len; i++) {
            item = arr[i];

            if (fn(item, i)) return item;
        }
        return null;
    },

    find: function (arr, fn) {
        var result = [],
            item;

        for (var i = 0, n = arr.length; i < n; i++) {
            item = arr[i];

            if (fn(item, i))
                result.push(item);
        }
        return result;
    },

    select: function (arr, fn) {
        var result = [],
            length = arr.length;

        for (var i = 0; i < length; i++)
            result.push(fn(arr[i], i));

        return result;
    },

    pick: function (obj, iteratee) {
        var result = {}, key;
        if (obj == null) return result;
        if (typeof iteratee === 'function') {
            for (key in obj) {
                var value = obj[key];
                if (iteratee(value, key, obj)) result[key] = value;
            }
        } else {
            var keys = concat.apply([], slice.call(arguments, 1));
            for (var i = 0, length = keys.length; i < length; i++) {
                key = keys[i];
                if (key in obj) result[key] = obj[key];
            }
        }
        return result;
    },

    pad: function (num, n) {
        var a = '0000000000000000' + num;
        return a.substr(a.length - (n || 2));
    },

    formatDate: function (d, f) {
        if (typeof d === "string" && /^\/Date\(\d+\)\/$/.test(d)) {
            d = new Function("return new " + d.replace(/\//g, ''))();
        } else if (typeof d === 'string') {
            f = d, d = new Date;
        } else if (typeof d === 'number' || !d) {
            d = new Date(d);
        }

        var y = d.getFullYear() + "", M = d.getMonth() + 1, D = d.getDate(), H = d.getHours(), m = d.getMinutes(), s = d.getSeconds(), mill = d.getMilliseconds() + "0000", pad = this.pad;
        return (f || 'yyyy-MM-dd HH:mm:ss').replace(/\y{4}/, y)
            .replace(/y{2}/, y.substr(2, 2))
            .replace(/M{2}/, pad(M))
            .replace(/M/, M)
            .replace(/d{2,}/, pad(D))
            .replace(/d/, d)
            .replace(/H{2,}/i, pad(H))
            .replace(/H/i, H)
            .replace(/m{2,}/, pad(m))
            .replace(/m/, m)
            .replace(/s{2,}/, pad(s))
            .replace(/s/, s)
            .replace(/f+/, function (w) {
                return mill.substr(0, w.length)
            })
    },

    template: function (str, data) {
        var tmpl = 'var __p=[];var $data=obj||{};with($data){__p.push(\'' +
            str.replace(/\\/g, '\\\\')
                .replace(/'/g, '\\\'')
                .replace(/<%=([\s\S]+?)%>/g, function (match, code) {
                    return '\',' + code.replace(/\\'/, '\'') + ',\'';
                })
                .replace(/<%([\s\S]+?)%>/g, function (match, code) {
                    return '\');' + code.replace(/\\'/, '\'')
                        .replace(/[\r\n\t]/g, ' ') + '__p.push(\'';
                })
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n')
                .replace(/\t/g, '\\t') +
            '\');}return __p.join("");',

            func = new Function('obj', tmpl);

        return data ? func(data) : func;
    },

    encodeHTML: function (text) {
        return ("" + text).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&#34;").split("'").join("&#39;");
    },

    noop: function () { },

    validateEmail: function (email) {
        return /^[-_a-zA-Z0-9\.]+@([-_a-zA-Z0-9]+\.)+[a-zA-Z0-9]{2,3}$/.test(email)
    },
    validateMobile: function (str) {
        return /^1[0-9]{10}$/.test(str)
    },

    convertTo26: function (code) {
        var result = 0;
        for (var i = code.length - 1; i >= 0; i--) {
            result = (code.charCodeAt(code.length - 1 - i) - 64) * Math.pow(26, i) + result;
        }
        return result
    },

    convertFrom26: function (num) {
        var result = "";
        while (num) {
            result = String.fromCharCode(--num % 26 + 65) + result
            num = Math.floor(num / 26)
        }
        return result
    }
};

module.exports = Util;
