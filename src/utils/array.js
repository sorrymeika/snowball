import { isArray } from './is';
import { contains, equals } from './object';

var RE_QUERY_ATTR = /([\w]+)(\^|\*|=|!|\$|~)?=(\d+|null|undefined|true|false|'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|(?:.*?(?=[,|&])))([,|&])?/g;

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
        if (val.charAt(0) == '\'' && val.slice(-1) == '\'') {
            val = val.slice(1, -1).replace(/\\\\'/g, '\'');
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
 * 筛选数组
 *
 * @param {String} query 查询字符串
 * @param {Array} arr 被查询的数组
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
export function query(query, arr) {
    if (!arr) {
        return compileQuery(query);

    } else if (typeof query !== 'string') {
        var tmp = arr;
        arr = query;
        query = tmp;
    }

    var match = compileQuery(query);
    var results = [];

    for (var i = 0, n = arr.length; i < n; i++) {
        if (match(arr[i])) results.push(arr[i]);
    }

    return results;
}

/**
 * map到一个新数组
 *
 * @param {Array} arr
 * @param {String|Function|Array} key
 */
export function map(arr, key) {
    var result = [];
    var i = 0, len = arr.length;

    if (typeof key === 'string') {
        for (; i < len; i++) {
            result.push(arr[i][key]);
        }
    } else if (isArray(key)) {
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

export function unique(arr, key) {
    let result = [],
        len = arr.length,
        eq = typeof key === 'string'
            ? (a, b) => a[key] === b[key]
            : typeof key === 'function'
                ? key
                : (a, b) => (a === b);

    for (let i = 0; i < len; i++) {
        let isUnique = true;
        for (let j = 0; j < result.length; j++) {
            if (eq(arr[i], result[j])) {
                isUnique = false;
                break;
            }
        }
        if (isUnique) {
            result.push(arr[i]);
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
export function filter(arr, key, val) {
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

/**
 * 查找第一个匹配的
 *
 * @param {Array} arr
 * @param {String|Function} key
 * @param {any} [val]
 */
export function find(arr, key, val) {
    var i = 0, len = arr.length;

    if (typeof key === 'string' && arguments.length == 3) {
        for (; i < len; i++) {
            if (arr[i][key] == val) return arr[i];
        }
    } else if (typeof key === 'function') {
        for (; i < len; i++) {
            if (key(arr[i], i)) return arr[i];
        }
    } else {
        for (; i < len; i++) {
            if (contains(arr[i], key)) return arr[i];
        }
    }

    return null;
}

/**
 * 排除匹配的
 *
 * @param {Array} arr
 * @param {String|Function} key
 * @param {any} [val]
 */
export const remove = exclude;

export function removeAt(arr, index) {
    var result = [];
    var i;
    for (i = 0; i < index; i++) {
        result.push(arr[i]);
    }

    var length = arr.length;
    for (i = index + 1; i < length; i++) {
        result.push(arr[i]);
    }

    return result;
}

/**
 * 排除匹配的
 *
 * @param {Array} arr
 * @param {String|Function|Object} key
 * @param {any} [val]
 */
export function exclude(arr, key, val) {
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

export function indexOf(arr, key, val) {
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

export function lastIndexOf(arr, key, val) {
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

/**
 * 保障所有浏览器排序结果都一样
 * @param {Array} arr 数组
 * @param {Function} fn 比较方法
 */
export function sort(arr, fn) {
    const symbol = Symbol(Date.now());
    let i = -1;
    let length = arr.length;
    while (++i < length) {
        arr[i][symbol] = i;
    }
    arr.sort((a, b) => {
        return fn(a, b) || a[symbol] - b[symbol];
    });
    while (--i >= 0) {
        delete arr[i][symbol];
    }
    return arr;
}


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
export function groupBy(query, data) {
    var results = [];
    var keys = [];
    var operations = [];

    query.split(/\s*,\s*/).forEach(function (item) {
        var m = /(sum|avg)\(([^)]+)\)/.exec(item);
        if (m) {
            operations.push({
                operation: m[1],
                key: m[2]
            });
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
        var n = results.length;
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
            };
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
                default:
            }
        }

        group.count++;
        group.group.push(item);

    });
    return results;
}

export function sum(arr, key) {
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

/**
 * 数组操作
 *
 * @param {Array} arr
 */
function LazyArray(arr) {
    this._array = arr;
    this._pipelines = [];
    this._predicates = [];
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

LazyArray.prototype.query = function (query) {
    this._predicates.push(ARRAY_QUERY, compileQuery(query));
    return this;
};

LazyArray.prototype.map = function (key) {
    this._predicates.push(ARRAY_MAP, typeof key === 'string'
        ? function (item) {
            return item[key];
        }
        : isArray(key)
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
};

LazyArray.prototype.filter = function (key, val) {
    var keyType = typeof key;

    this._predicates.push(ARRAY_FILTER, keyType === 'string' && arguments.length == 2
        ? function (item) {
            return item[key] == val;
        }
        : keyType === 'function'
            ? key
            : function (item) {
                return contains(item, key);
            });
    return this;
};

LazyArray.prototype.exclude = function (key, val) {
    this.filter(key, val);
    this._predicates[this._predicates.length - 2] = ARRAY_EXCLUDE;
    return this;
};

LazyArray.prototype._renewPredicates = function () {
    if (this._predicates.length) {
        this._pipelines.push({
            type: ARRAY_LOOP,
            _predicates: this._predicates
        });
        this._predicates = [];
    }
};

LazyArray.prototype._addPipeline = function (type, fn) {
    this._renewPredicates();
    this._pipelines.push({
        type: type,
        _predicates: fn
    });
    return this;
};

LazyArray.prototype.concat = function (arr) {
    return this._addPipeline(ARRAY_CONCAT, function (result) {
        return result.concat(arr);
    });
};

LazyArray.prototype.reduce = function (fn, first) {
    return this._addPipeline(ARRAY_REDUCE, function (result) {
        return result.reduce(fn, first);
    });
};

LazyArray.prototype.reduceRight = function (fn, first) {
    return this._addPipeline(ARRAY_REDUCE, function (result) {
        return result.reduceRight(fn, first);
    });
};

LazyArray.prototype.remove = function (key, val) {
    return this._addPipeline(ARRAY_REMOVE, function (result) {
        return remove(result, key, val);
    });
};

LazyArray.prototype.find = LazyArray.prototype.first = function (key, val) {
    this.filter(key, val);
    this._predicates[this._predicates.length - 2] = ARRAY_FIRST;
    return this.toJSON();
};

LazyArray.prototype.toArray = LazyArray.prototype.toJSON = function () {
    var result = this._array;
    var conditionGroup;
    var arr;
    var isFindFirst = false;

    this._renewPredicates();

    for (var i = 0; i < this._pipelines.length; i++) {
        conditionGroup = this._pipelines[i];

        if (conditionGroup.type == ARRAY_LOOP) {
            arr = [];
            outer: for (var j = 0; j < result.length; j++) {
                var item = result[j];

                for (var k = 0; k < conditionGroup._predicates.length;) {
                    var type = conditionGroup._predicates[k++];
                    var fn = conditionGroup._predicates[k++];

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
                        default:
                    }
                }

                arr.push(item);
            }
            if (isFindFirst) return null;

            result = arr;
        } else {
            result = conditionGroup._predicates(result);
        }
    }

    return result;
};

export function array(arr) {
    return new LazyArray(arr);
}