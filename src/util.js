/**
 * 作者: sunlu
 * 用途: 工具类
 */

var ArrayProto = Array.prototype,
    slice = ArrayProto.slice,
    concat = ArrayProto.concat,
    hasOwnProperty = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var guid = 0;

var ua = typeof navigator == 'undefined' ? '' : navigator.userAgent,
    ios = ua.match(/(iPhone|iPad|iPod).*OS\s([\d_]+)/i),
    ie = ua.match(/MSIE (\d+)/i),
    android = ua.match(/(Android);?[\s\/]+([\d.]+)?/),
    isAndroid = !!android,
    osVersion;

if (ios) osVersion = ios[2].split('_');
else if (android) osVersion = android[2].split('.');
else if (ie) osVersion = ie[1].split('.');

var util = {

    isInApp: /SLApp/.test(ua),
    ios: !!ios,
    iOS: !!ios,
    ie: !!ie,
    android: isAndroid,
    osVersion: osVersion ? parseFloat(osVersion[0] + '.' + osVersion[1]) : 0,
    isInWechat: /micromessenger/i.test(ua),

    joinPath: function () {
        var args = [].slice.apply(arguments);
        var result = args.join('/').replace(/[\\]+/g, '/').replace(/([^:\/]|^)[\/]{2,}/g, '$1/').replace(/([^\.]|^)\.\//g, '$1');
        var flag = true;

        var replacePath = function (match, name) {
            if (name == '..') return match;
            if (!flag) flag = true;
            return '';
        };

        while (flag) {
            flag = false;
            result = result.replace(/([^\/]+)\/\.\.(\/|$)/g, replacePath);
        }
        return result.replace(/\/$/, '');
    },

    guid: function () {
        return ++guid;
    },

    uuid: function () {
        return util.randomString(36);
    },

    randomString: function (len) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),
            uuid = '',
            rnd = 0,
            r;
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

    random: function (min, max) {
        if (max == null) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    },

    isNo: function (value) {
        return !value || (Array.isArray(value) && !value.length) || (toString.call(value) == '[object Object]' && util.isEmptyObject(value));
    },

    isYes: function (value) {
        return !util.isNo(value);
    },

    isThenable: function (thenable) {
        return thenable && typeof thenable === 'object' && typeof thenable.then === 'function';
    },

    isPlainObject: function (value) {
        return value && (value.constructor === Object || value.constructor === undefined);
    },

    isEmptyObject: function (obj) {
        if (!obj) return false;

        for (var name in obj) {
            return false;
        }
        return true;
    },

    log: function (msg) {
        if (!this.$log) {
            this.$log = window.$('<div style="height:40px;position:fixed;top:0;left:0;right:0;z-index:100000;background:#fff;overflow-y:scroll;word-break:break-all;word-wrap:break-word;"></div>').appendTo('body');
        }
        if (arguments.length > 1) {
            msg += ArrayProto.slice.call(arguments, 1).join(' ');
        }
        this.$log.html(msg + '<br>' + this.$log.html());
    },

    pad: function (num, n) {
        var a = '0000000000000000' + num;
        return a.substr(a.length - (n || 2));
    },

    commafy: function (number) {
        return (number + '').replace(/\d{1,3}(?=(\d{3})+(\.\d+)?$)/g, '$&,')
    },

    /**
     * 获取圆上的点坐标
     * 
     * @param {number} x0 原点x
     * @param {number} y0 原点y
     * @param {number} r 半径
     * @param {number} a 角度
     */
    pointOnCircle: function (x0, y0, r, a) {
        return {
            x: x0 + r * Math.cos(a * Math.PI / 180),
            y: y0 + r * Math.sin(a * Math.PI / 180)
        };
    },

    fixFloat: function (f) {
        return Math.round((typeof f === 'number' ? f : parseFloat(f || 0)) * 100) / 100;
    },

    currency: function (prefix, str) {
        if (str == undefined) {
            str = prefix;
            prefix = null;
        }
        return (prefix === undefined || prefix === null ? '' : prefix) + ((Math.round(parseFloat(str) * 100) / 100) || 0);
    },

    rmb: function (str) {
        return util.currency('¥', str);
    },

    value: function (data, names) {
        if (typeof names === 'string')
            names = names.split('.');

        for (var i = 0, len = names.length; i < len; i++) {
            data = data[names[i]];
        }

        return data;
    },

    params: function (params) {
        return Object.keys(params).map(function (key) {
            return key + "=" + (params[key] ? encodeURIComponent(params[key]) : '');
        }).join('&');
    },

    queryString: function (name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = location.search.substr(1).match(reg);

        return r ? unescape(r[2]) : null;
    },

    encodeHTML: function (text) {
        return ("" + text).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&#34;").split("'").join("&#39;");
    },

    format: function (format) {
        var args = slice.call(arguments);
        return format.replace(/\{(\d+)\}/g, function (match, index) {
            return args[parseInt(index) + 1];
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

    style: function (id, css, isReplace) {
        var doc = document,
            head = doc.getElementsByTagName("head")[0];

        if (css === undefined) {
            css = id;
            id = "style" + util.guid();
        }
        var style = document.getElementById(id);
        if (style) {
            if (isReplace) {
                style.parentNode.removeChild(style);
            } else {
                return style;
            }
        }

        style = doc.createElement("style");
        style.id = id;
        style.type = "text/css";
        try {
            style.appendChild(doc.createTextNode(css));
        } catch (ex) {
            style.styleSheet.cssText = css;
        }
        head.appendChild(style);

        return style;
    },

    cookie: function (a, b, c, p) {
        if (b === undefined) {
            var res = document.cookie.match(new RegExp("(^| )" + a + "=([^;]*)(;|$)"));
            if (res != null)
                return unescape(res[2]);
            return null;
        } else {
            if (b === null) {
                b = util.cookie(name);
                if (b != null) c = -1;
                else return;
            }
            if (c) {
                var d = new Date();
                d.setTime(d.getTime() + c * 24 * 60 * 60 * 1000);
                c = ";expires=" + d.toGMTString();
            }
            document.cookie = a + "=" + escape(b) + (c || "") + ";path=" + (p || '/')
        }
    },

    store: function (key, value) {
        if (location.search && /(?:\?|&)STORE_ID\=(\d+)/.test(location.search)) {
            key = RegExp.$1 + ")" + key;
        }

        if (typeof value === 'undefined')
            return JSON.parse(localStorage.getItem(key));
        if (value === null)
            localStorage.removeItem(key);
        else
            localStorage.setItem(key, JSON.stringify(value));
    },

    noop: function () { }
};


/**
 * 简单时间处理方法
 */

/**
 * @param {number} timestamp
 */
util.timeLeft = function (timestamp) {
    var pad = util.pad;
    var days = Math.floor(timestamp / (1000 * 60 * 60 * 24));
    timestamp = timestamp % (1000 * 60 * 60 * 24);

    var hours = Math.floor(timestamp / (1000 * 60 * 60));
    timestamp = timestamp % (1000 * 60 * 60);

    var minutes = Math.floor(timestamp / (1000 * 60));
    timestamp = timestamp % (1000 * 60);

    var seconds = Math.floor(timestamp / 1000);
    timestamp = timestamp % (1000);

    return (days == 0 ? '' : (days + '天 ')) +
        pad(hours) + ":" +
        pad(minutes) + ":" +
        pad(seconds)
}

/**
 * string 转 date
 * 
 * @param {String} date
 * @return {Date}
 */
util.parseDate = function (date) {
    date = date.split(/\s+|\:|\-|年|月|日|\//).map(function (time) {
        return parseInt(time);
    });

    return new Date(date[0], date[1] - 1, date[2], date[3], date[4], date[5]);
}

/**
 * date 转 string
 * 
 * @param {Date|timestamp} d
 * @param {String} f 格式化字符串:yyyy-MM-dd HH:mm:ss_ffff | short | minutes
 * @return {Date}
 */
util.formatDate = function (d, f) {
    if (typeof d === "string" && /^\/Date\(\d+\)\/$/.test(d)) {
        d = new Function("return new " + d.replace(/\//g, ''))();
    } else if (typeof d === 'string' && !f) {
        f = d;
        d = new Date;
    } else if (typeof d === 'number') {
        d = new Date(d);
    } else if (!(d instanceof Date)) {
        return '';
    }

    var pad = util.pad;
    var now;
    var today;
    var date;
    var initDate = function () {
        now = new Date();
        today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    if (f === 'minutes') {
        initDate();

        var res = '';
        if (today - date == 86400000) {
            res += '昨天 ';
        } else if (today - date == 0) {
            //res += '今天';
        } else {
            res += pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + " ";
        }
        res += pad(d.getHours()) + ':' + pad(d.getMinutes());
        return res;
    } else if (f === 'short') {
        initDate();

        if (today - date == 86400000) {
            return '昨天' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        } else if (today - date == 0) {
            var minutes = Math.round((now - d) / 60000);

            if (minutes <= 2) {
                return '刚刚';
            } else if (minutes < 60) {
                return minutes + '分钟前';
            } else {
                var hours = Math.round(minutes / 60);
                if (hours < 12) {
                    return hours + '小时前';
                } else {
                    return pad(d.getHours()) + ':' + pad(d.getMinutes());
                }
            }
        } else {
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
        }
    }

    var week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

    var y = d.getFullYear() + "",
        M = d.getMonth() + 1,
        D = d.getDate(),
        H = d.getHours(),
        m = d.getMinutes(),
        s = d.getSeconds(),
        mill = d.getMilliseconds() + "0000";
    return (f || 'yyyy-MM-dd HH:mm:ss').replace(/\y{4}/, y)
        .replace(/y{2}/, y.substr(2, 2))
        .replace(/M{2}/, pad(M))
        .replace(/M/, M)
        .replace(/W/, week[d.getDay()])
        .replace(/d{2,}/, pad(D))
        .replace(/d/, D)
        .replace(/H{2,}/i, pad(H))
        .replace(/H/i, H)
        .replace(/m{2,}/, pad(m))
        .replace(/m/, m)
        .replace(/s{2,}/, pad(s))
        .replace(/s/, s)
        .replace(/f+/, function (w) {
            return mill.substr(0, w.length)
        });
}


/**
 * Array/Object 处理相关方法
 */

function classExtend(proto) {
    var parent = this,
        child = hasOwnProperty.call(proto, 'constructor') ? proto.constructor : function () {
            return parent.apply(this, arguments);
        };

    var Surrogate = function () {
        this.constructor = child;
    };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    for (var key in proto)
        child.prototype[key] = proto[key];

    for (var keyOfSuper in parent)
        child[keyOfSuper] = parent[keyOfSuper];

    child.prototype.__super__ = parent.prototype;

    return child;
}

util.createClass = function (proto) {
    var func = hasOwnProperty.call(proto, 'constructor') ? proto.constructor : function () {
    }
    func.prototype = proto;
    func.prototype.constructor = func;
    func.extend = classExtend;
    return func;
}

/**
 * pick Object
 */
util.pick = function (obj, iteratee) {
    var result = {},
        key;
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
}


/**
 * 判断两个 Object/Array 是否相等
 * 
 * @param {any} a
 * @param {any} b
 * @param {boolean} [identical] 是否全等`===`
 */
function equals(a, b, identical) {
    if (identical ? a === b : a == b) return true;

    var typeA = toString.call(a);
    var typeB = toString.call(b);
    var i;

    if (typeA !== typeB) return false;

    switch (typeA) {
        case '[object Object]':
            var keysA = Object.keys(a);
            if (keysA.length != Object.keys(b).length) {
                return false;
            }

            var key;
            for (i = keysA.length; i >= 0; i--) {
                key = keysA[i];

                if (!equals(a[key], b[key], identical)) return false;
            }
            break;
        case '[object Array]':
            if (a.length != b.length) {
                return true;
            }
            for (i = a.length; i >= 0; i--) {
                if (!equals(a[i], b[i], identical)) return false;
            }
            break;
        case '[object Date]':
            return +a == +b;
        case '[object RegExp]':
            return ('' + a) === ('' + b);
        default:
            if (identical ? a !== b : a != b) return false;
    }

    return true;
}

util.equals = equals;

util.identifyWith = function (a, b) {
    return equals(a, b, true);
}

/**
 * 判断一个`Object`和另外一个`Object`是否`keys`重合且值相等
 * 
 * @param {Object|Array} parent 
 * @param {Object|any} obj 
 */
function contains(parent, obj) {
    var typeA = toString.call(parent);
    var i;

    switch (typeA) {
        case '[object Object]':
            var keys = Object.keys(obj);
            for (i = keys.length; i >= 0; i--) {
                var key = keys[i];

                if (obj[key] != parent[key]) return false;
            }
            break;
        case '[object Array]':
            if (!Array.isArray(obj)) return parent.indexOf(obj[i]) != -1;

            for (i = obj.length; i >= 0; i--) {
                if (parent.indexOf(obj[i]) == -1) return false;
            }
            break;
        default:
            return obj == parent;
    }
    return true;
}

util.contains = contains;

var RE_QUERY_ATTR = /([\w]+)(\^|\*|=|!|\$|~)?\=(\d+|null|undefined|true|false|'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|(?:.*?(?=[,\|&])))([,\|&])?/g;

/**
 * 将 query 编译成 查询方法
 * 
 * @param {String} query 要编译的string
 * query = "attr^='somevalue'|c1=1,att2=2"
 * 
 * @return {Function} (Object)=>boolean
 */
function compileQuery(query) {
    var group = [];
    var groups = [group];

    query.replace(RE_QUERY_ATTR, function (match, attr, op, val, lg) {
        //console.log(match, attr, op, val, lg);

        if (val.charAt(0) == '\'' && val.slice(-1) == '\'') {
            val = val.slice(1, -1).replace(/\\\'/g, '\'');
        } else {
            val = val === 'undefined' ? undefined : JSON.parse(val);
        }

        group.push({
            attr: attr,
            op: op,
            val: val,
            lg: lg
        });

        if (lg == ',') {
            groups.push(group = []);
        }
    });

    return groups[0].length > 0 ? function (obj) {
        return matchObject(groups, obj);
    } : function () { return true; };
}


/**
 * 判断某 Object 是否匹配`compileQuery`方法编译后的查询条件组
 * 
 * @param {Array} queryGroups 查询条件组 
 * @param {Object} obj 
 * 
 * @returns {boolean}
 */
function matchObject(queryGroups, obj) {
    var result = true;
    var val;
    var group;
    var item;

    if (queryGroups) {
        if (!obj) return false;

        for (var i = 0, length = queryGroups.length; i < length; i++) {
            group = queryGroups[i];
            result = true;

            for (var j = 0, n = group.length; j < n; j++) {
                item = group[j];
                val = obj[item.attr];

                switch (item.op) {
                    case '=':
                        result = val === item.val;
                        break;
                    case '!':
                        result = val != item.val;
                        break;
                    case '^':
                        result = val && (val.slice(0, item.val.length) == item.val);
                        break;
                    case '$':
                        result = val && (val.slice(-item.val.length) == item.val);
                        break;
                    case '*':
                        result = val && val.indexOf(item.val) != -1;
                        break;
                    case '~':
                        result = item.val !== null && item.val !== undefined
                            ? val && val.toLowerCase().indexOf(('' + item.val).toLowerCase()) != -1 : true;
                        break;
                    default:
                        result = val == item.val;
                        break;
                }

                if (!result) {
                    if (item.lg == '&') {
                        break;
                    }
                } else {
                    if (item.lg == '|') {
                        break;
                    }
                }
            }

            if (!result)
                break;
        }
    }
    return result;
}


/**
 * 数组操作
 * 
 * @param {Array} array 
 */
function ArrayQuery(array) {
    this.array = array;
    this.conditionGroups = [];
    this.conditions = [];
}

var ARRAY_QUERY = 1;
var ARRAY_MAP = 2;
var ARRAY_CONCAT = 3;
var ARRAY_FILTER = 4;
var ARRAY_REMOVE = 5;
var ARRAY_LOOP = 6;
var ARRAY_EXCLUDE = 7;
var ARRAY_REDUCE = 8;
var ARRAY_FIRST = 9;

ArrayQuery.prototype._ = function (query) {
    this.conditions.push(ARRAY_QUERY, compileQuery(query));
    return this;
}

ArrayQuery.prototype.map = function (key) {
    this.conditions.push(ARRAY_MAP, typeof key === 'string'
        ? function (item) {
            return item[key];
        }
        : Array.isArray(key)
            ? function (item) {
                var res = {};
                for (var i = key.length - 1; i >= 0; i--) {
                    var k = key[i];
                    if (k in item) res[k] = item[k];
                }
                return res;
            }
            : key);

    return this;
}

ArrayQuery.prototype.filter = function (key, val) {
    var keyType = typeof key;

    this.conditions.push(ARRAY_FILTER, keyType === 'string' && arguments.length == 2
        ? function (item) {
            return item[key] == val;
        }
        : keyType === 'function'
            ? key
            : function (item) {
                return contains(item, key)
            });
    return this;
}

ArrayQuery.prototype.exclude = function (key, val) {
    this.filter(key, val);
    this.conditions[this.conditions.length - 2] = ARRAY_EXCLUDE;
    return this;
}

ArrayQuery.prototype._renewConditions = function () {
    if (this.conditions.length) {
        this.conditionGroups.push({
            type: ARRAY_LOOP,
            conditions: this.conditions
        });
        this.conditions = [];
    }
}

ArrayQuery.prototype.addConditionGroup = function (type, fn) {
    this._renewConditions();
    this.conditionGroups.push({
        type: type,
        conditions: fn
    });
    return this;
}

ArrayQuery.prototype.concat = function (array) {
    return this.addConditionGroup(ARRAY_CONCAT, function (result) {
        return result.concat(array);
    });
}

ArrayQuery.prototype.reduce = function (fn, first) {
    return this.addConditionGroup(ARRAY_REDUCE, function (result) {
        return result.reduce(fn, first);
    });
}

ArrayQuery.prototype.reduceRight = function (fn, first) {
    return this.addConditionGroup(ARRAY_REDUCE, function (result) {
        return result.reduceRight(fn, first);
    });
}

ArrayQuery.prototype.remove = function (key, val) {
    return this.addConditionGroup(ARRAY_REMOVE, function (result) {
        return remove(result, key, val);
    });
}

ArrayQuery.prototype.find = ArrayQuery.prototype.first = function (key, val) {
    this.filter(key, val);
    this.conditions[this.conditions.length - 2] = ARRAY_FIRST;
    return this.toJSON();
}

ArrayQuery.prototype.toArray = ArrayQuery.prototype.toJSON = function () {
    var result = this.array;
    var conditionGroup;
    var array;
    var isFindFirst = false;

    this._renewConditions();

    for (var i = 0; i < this.conditionGroups.length; i++) {
        conditionGroup = this.conditionGroups[i];

        if (conditionGroup.type == ARRAY_LOOP) {
            array = [];
            outer: for (var j = 0; j < result.length; j++) {
                var item = result[j];

                for (var k = 0; k < conditionGroup.conditions.length;) {
                    var type = conditionGroup.conditions[k++];
                    var fn = conditionGroup.conditions[k++];

                    switch (type) {
                        case ARRAY_FIRST:
                            if (fn(item, j, result)) return item;
                            isFindFirst = true;
                            break;
                        case ARRAY_QUERY:
                        case ARRAY_FILTER:
                            if (!fn(item, j, result))
                                continue outer;
                            break;
                        case ARRAY_EXCLUDE:
                            if (fn(item, j, result))
                                continue outer;
                            break;
                        case ARRAY_MAP:
                            item = fn(item, j, result);
                            break;
                    }
                }

                array.push(item);
            }
            if (isFindFirst) return null;

            result = array;
        } else {
            result = conditionGroup.conditions(result);
        }
    }

    return result;
}

util.array = function (array) {
    return new ArrayQuery(array);
}

/**
 * 筛选数组
 * 
 * @param {String} query 查询字符串
 * @param {Array} array 被查询的数组
 * 
 * @example
 * console.log(util.query("[attr!=undefined]", [{ attr: 1 }]))
 * 
 * 判断Object是否匹配
 * var match = util.query("attr^='somevalue'|c1=1,att2!=2");
 * match({
 *     attr: 'somevalue11'
 * });
 */
util.query = function (query, array) {
    if (!array) {
        return compileQuery(query);

    } else if (typeof query !== 'string') {
        var tmp = array;
        array = query;
        query = tmp;
    }

    var match = compileQuery(query);
    var results = [];

    for (var i = 0, n = array.length; i < n; i++) {
        if (match(array[i])) results.push(array[i]);
    }

    return results;
}

/**
 * map到一个新数组
 * 
 * @param {Array} arr 
 * @param {String|Function|Array} key 
 */
util.map = function (arr, key) {
    var result = [];
    var i = 0, len = arr.length;

    if (typeof key === 'string') {
        for (; i < len; i++) {
            result.push(arr[i][key]);
        }
    } else if (Array.isArray(key)) {
        var item;
        var k;
        for (; i < len; i++) {
            item = {};
            for (var j = key.length - 1; j >= 0; j--) {
                k = key[j];
                if (k in arr[i]) item[k] = arr[i][k];
            }
            result.push(item);
        }
    } else {
        for (; i < len; i++) {
            result.push(key(arr[i], i));
        }
    }

    return result;
}


/**
 * 筛选数组中匹配的
 * 
 * @param {Array} arr 
 * @param {String|Function|Object} key 
 * @param {any} val 
 */
function filter(arr, key, val) {
    var keyType = typeof key;
    var result = [];
    var i = 0;
    var length = arr.length;

    if (keyType === 'string' && arguments.length == 3) {
        for (; i < length; i++) {
            if (arr[i][key] == val)
                result.push(arr[i]);
        }
    } else if (keyType === 'function') {
        for (; i < length; i++) {
            if (key(arr[i], i))
                result.push(arr[i]);
        }
    } else {
        for (; i < length; i++) {
            if (contains(arr[i], key))
                result.push(arr[i]);
        }
    }

    return result;
}

util.filter = util.find = filter;


/**
 * 查找第一个匹配的
 * 
 * @param {Array} array 
 * @param {String|Function} key 
 * @param {any} [val]
 */
function first(array, key, val) {
    var i = 0, len = array.length;

    if (typeof key === 'string' && arguments.length == 3) {
        for (; i < len; i++) {
            if (array[i][key] == val) return array[i];
        }
    } else if (typeof key === 'function') {
        for (; i < len; i++) {
            if (key(array[i], i)) return array[i];
        }
    } else {
        for (; i < len; i++) {
            if (contains(array[i], key)) return array[i];
        }
    }

    return null;
}

util.first = first;


/**
 * 移除数组中匹配的
 * 
 * @param {Array} arr 
 * @param {String|Function} key 
 * @param {any} [val] 
 */
function remove(arr, key, val) {
    var keyType = typeof key;
    var result = [];
    var length = arr.length;
    var i = length - 1;

    if (keyType === 'string' && arguments.length == 3) {
        for (; i >= 0; i--) {
            if (arr[i][key] == val) arr.splice(i, 1);
        }
    } else if (keyType === 'function') {
        for (; i >= 0; i--) {
            if (key(arr[i], i)) arr.splice(i, 1);
        }
    } else {
        for (; i >= 0; i--) {
            if (contains(arr[i], key)) arr.splice(i, 1);
        }
    }

    return result;
}

util.remove = remove;


/**
 * 排除匹配的
 * 
 * @param {Array} arr 
 * @param {String|Function|Object} key 
 * @param {any} [val] 
 */
function exclude(arr, key, val) {
    var length = arr.length;
    var keyType = typeof key;
    var result = [];
    var i = 0;

    if (keyType === 'string' && arguments.length == 3) {
        for (; i < length; i++) {
            if (arr[i][key] != val) result.push(arr[i]);
        }
    } else if (keyType === 'function') {
        for (; i < length; i++) {
            if (!key(arr[i], i)) result.push(arr[i]);
        }
    } else {
        for (; i < length; i++) {
            if (!contains(arr[i], key)) result.push(arr[i]);
        }
    }

    return result;
}

util.exclude = exclude;


/**
 * 将数组分组
 * 
 * @example
 * groupBy('day,sum(amount)', [{ day: 333, amout: 22 }, { day: 333, amout: 22 }])
 * // [{ key: { day: 333 }, sum: { amount: 44 }, group: [...] }]
 * 
 * @param {String} query 分组条件
 * @param {Array} data 
 * @return {Array}
 */
function groupBy(query, data) {
    var results = [];
    var keys = [];
    var operations = [];

    query.split(/\s*,\s*/).forEach(function (item) {
        var m = /(sum|avg)\(([^\)]+)\)/.exec(item);
        if (m) {
            operations.push({
                operation: m[1],
                key: m[2]
            })
        } else {
            keys.push(item);
        }
    });

    data.forEach(function (item) {
        var key = {};
        var group = false;

        for (var j = 0, k = keys.length; j < k; j++) {
            key[keys[j]] = item[keys[j]];
        }

        var i = 0;
        var n = results.length
        for (; i < n; i++) {
            if (equals(results[i].key, key)) {
                group = results[i];
                break;
            }
        }

        if (!group) {
            group = {
                key: key,
                count: 0,
                group: []
            }
            results.push(group);
        }

        for (i = 0, n = operations.length; i < n; i++) {
            var name = operations[i].key;

            switch (operations[i].operation) {
                case 'sum':
                    if (!group.sum) {
                        group.sum = {};
                    }
                    if (group.sum[name] === undefined) {
                        group.sum[name] = 0;
                    }
                    group.sum[name] += item[name];
                    break;
                case 'avg':
                    if (!group.avg) {
                        group.avg = {};
                    }
                    if (group.avg[name] === undefined) {
                        group.avg[name] = 0;
                    }
                    group.avg[name] = (group.avg[name] * group.count + item[name]) / (group.count + 1);
                    break;
            }
        }

        group.count++;
        group.group.push(item);

    });
    return results;
}

util.groupBy = groupBy;

function sum(arr, key) {
    var result = 0;
    var i = 0, n = arr.length;

    if (typeof key === 'string') {
        for (; i < n; i++) {
            result += arr[i][key];
        }
    } else {
        for (; i < n; i++) {
            result += key(arr[i], i);
        }
    }

    return result;
}

util.sum = sum;

function indexOf(arr, key, val) {
    var length = arr.length;
    var keyType = typeof key;
    var i = 0;

    if (keyType === 'string' && arguments.length == 3) {
        for (; i < length; i++) {
            if (arr[i][key] == val) return i;
        }
    } else if (keyType === 'function') {
        for (; i < length; i++) {
            if (key(arr[i], i)) return i;
        }
    } else {
        for (; i < length; i++) {
            if (contains(arr[i], key)) return i;
        }
    }

    return -1;
}

util.indexOf = indexOf;

function lastIndexOf(arr, key, val) {
    var keyType = typeof key;
    var i = arr.length - 1;

    if (keyType === 'string' && arguments.length == 3) {
        for (; i >= 0; i--) {
            if (arr[i][key] == val) return i;
        }
    } else if (keyType === 'function') {
        for (; i >= 0; i--) {
            if (key(arr[i], i)) return i;
        }
    } else {
        for (; i >= 0; i--) {
            if (contains(arr[i], key)) return i;
        }
    }

    return -1;
}

util.lastIndexOf = lastIndexOf;


/**
 * 常用验证
 */

util.validateEmail = function (email) {
    return /^[-_a-zA-Z0-9\.]+@([-_a-zA-Z0-9]+\.)+[a-zA-Z0-9]{2,3}$/.test(email)
}

util.validateMobile = function (str) {
    return /^1[0-9]{10}$/.test(str)
}

module.exports = util;
