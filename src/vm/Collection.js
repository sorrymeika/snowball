import { isArray, isString, isFunction, isNumber } from '../utils/is';
import * as arrayUtils from '../utils/array';
import { extend } from '../utils/clone';
import { contains } from '../utils/object';

import { Observer } from './Observer';
import { Model } from './Model';
import { isObservable, isCollection, TYPEOF } from './predicates';
import { enqueueUpdate } from './methods/enqueueUpdate';
import { updateRefs } from './methods/updateRefs';
import { connect, setMapper, disconnect, freezeObject } from './methods/connect';
import { observeProp, unobserveProp } from './methods/observeProp';
import compute from './operators/compute';
import { getRelObserverOrSelf } from './methods/getRelObserver';
import { renewSet } from './methods/set';

const RE_COLL_QUERY = /\[((?:'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^\]])+)\](?:\[([+-]?)(\d+)?\])?(?:\.(.*))?/;

function matcher(key, val) {
    return isString(key)
        ? (item, i) => item[key] === val
        : isFunction(key)
            ? key
            : (item) => contains(item, key);
}

function createItem(collection, index, data) {
    return collection.constructor.createItem(collection, index, data);
}

function connectItem(collection, data, index) {
    const item = getRelObserverOrSelf(data);
    if (isObservable(item)) {
        connect(collection, item, index);
        return item;
    } else {
        return createItem(collection, index, item);
    }
}

function collectionWillUpdate(collection) {
    const { state } = collection;
    if (!state.setting) {
        state.setting = 1;
        state.changed = false;
        state.backup = state.data;
        state.data = [...state.data];
    } else {
        state.setting++;
    }
}

function collectionDidUpdate(collection) {
    const { state } = collection;
    if (state.setting && --state.setting == 0) {
        if (state.changed) {
            freezeObject(state.data, collection);
            enqueueUpdate(collection);
            updateRefs(collection);
        } else if (state.backup) {
            state.data = state.backup;
        }
        state.setting = false;
        state.backup = null;
    }
    return collection;
}

/**
 * 更新 collection 中的 model
 *
 * @param {Array|Object} arr 需要更新的数组
 * @param {String|Function} comparator 唯一健 或 (a, b)=>boolean
 * @param {boolean} [appendMatched] 是否追加不匹配的
 * @param {boolean} [renewItem] 是否覆盖匹配项
 * @param {boolean} [updateAll] 是否更新全部匹配的
 *
 * @return {Collection} input collection
 */
function update(collection, arr, comparator, appendUnmatched = true, renewItem = false, updateAll = false) {
    if (!arr) return collection;

    let fn;
    const length = collection.length;

    if (!length) {
        appendUnmatched && collection.add(arr);
        return collection;
    }

    collectionWillUpdate(collection);

    if (isString(comparator)) {
        fn = function (a, b) {
            return a[comparator] == b[comparator];
        };
    } else if (isFunction(fn))
        fn = comparator;
    else {
        fn = contains;
    }


    if (!isArray(arr)) arr = [arr];
    else arr = [].concat(arr);

    let n = arr.length;

    for (let i = length - 1; i >= 0; i--) {
        let arrItem;
        let data = collection.state.data[i];

        for (let j = 0; j < n; j++) {
            if ((arrItem = arr[j]) !== undefined) {
                if (fn.call(collection, data, arrItem)) {
                    const item = renewSet(collection[i], renewItem, arrItem);
                    if (item.state.changed) {
                        collection.state.changed = true;
                    }
                    if (!updateAll) {
                        // 只匹配一次，提高性能
                        arr[j] = undefined;
                    }
                    break;
                }
            }
        }
    }

    if (appendUnmatched) {
        const appends = [];
        for (let i = 0; i < n; i++) {
            if (arr[i] !== undefined) {
                appends.push(arr[i]);
            }
        }
        if (appends.length) {
            collection.add(appends);
        }
    }

    return collectionDidUpdate(collection);
}

export function withMutations(observer, fn) {
    collectionWillUpdate(observer);
    fn();
    collectionDidUpdate(observer);
    return observer;
}

export function initCollection(array, attributeName, parent) {
    const { state } = this;
    state.initialized = false;
    state.data = [];

    if (parent) {
        connect(parent, this, attributeName);
    }

    if (array && array.length) this.add(array);
    else freezeObject(state.data, this);
    this.state.initialized = true;
}

export class Collection extends Observer {
    static createItem(parent, index, data) {
        return new Model(data, index, parent);
    }

    constructor(array, attributeName, parent) {
        super();
        initCollection.call(this, array, attributeName, parent);
    }

    get array() {
        return this.state.data;
    }

    set array(val) {
        this.set(val);
    }

    length = 0;

    /**
     * 查询Collection的子Model/Collection
     *
     * 第n个:
     * collection._(1)
     *
     * 查询所有符合的:
     * collection._("[attr='val']")
     * 数据类型也相同:[attr=='val']
     * 以val开头:[attr^='val']
     * 以val结尾:[attr$='val']
     * 包含val，区分大小写:[attr*='val']
     * 包含val，不区分大小写:[attr~='val']
     * 或:[attr='val'|attr=1,attr='val'|attr=1]
     * 且:[attr='val'&attr=1,attr='val'|attr=1]
     *
     * 查询并返回第n个:
     * collection._("[attr='val'][n]")
     *
     * 一个都不存在则添加:
     * collection._("[attr='val'][+]")
     *
     * 结果小于n个时则添加:
     * collection._("[attr='val'][+n]")
     *
     * 删除全部搜索到的，并返回被删除的:
     * collection._("[attr='val'][-]")
     *
     * 删除搜索结果中第n个，并返回被删除的:
     * collection._("[attr='val'][-n]")
     *
     * @param {string} search 查询条件
     * @param {object} [def] 数据不存在时默认添加的数据
     *
     * @return {array|Model|Collection}
     */
    _(search, def) {
        if (typeof search == 'number' || /^\d+$/.test(search))
            return this[search];
        else if (/^\[(\d+)\]$/.test(search))
            return this[RegExp.$1];

        var match = search.match(RE_COLL_QUERY);
        var query = match[1];
        var next = match[4];
        var model;

        if (/^\d+$/.test(query))
            return (model = this[query]) ? (next ? model : model._(next)) : null;

        var operation = match[2];
        var index = match[3] ? parseInt(match[3], 10) : operation == '+' ? 0 : undefined;

        var test = arrayUtils.query(query);
        var array = this.state.data;
        var results;
        var i = 0;
        var n = array.length;
        var j;

        // 移除操作
        if (operation == '-') {
            j = 0;
            results = [];
            var from = index === undefined ? 0 : index;
            var to = index === undefined ? n : index;

            for (; i < n; i++) {
                if (test(array[i])) {
                    if (j >= from && j <= to) {
                        model = this.splice(i, 1)[0];
                        results.push(next ? model._(next) : model);
                    }

                    j++;
                }
            }
            return results;
        } else if (index === undefined) {
            // 根据条件查询
            results = [];
            for (; i < n; i++) {
                if (test(array[i])) {
                    results.push(next ? this[i]._(next) : this[i]);
                }
            }
            return results;
        } else {
            // 根据条件查询，并返回第n个结果
            j = 0;
            for (; i < n; i++) {
                if (test(array[i])) {
                    if (j === index) {
                        return next ? this[i]._(next) : this[i];
                    }
                    j++;
                }
            }
            if (operation == '+') {
                if (!def) throw new Error("`+` operation must include default value");
                return this.add(def);
            }
            return null;
        }
    }

    observe(attribute, fn) {
        if (isString(attribute) || isNumber(attribute)) {
            return observeProp(this, attribute, fn);
        }
        return super.observe(attribute);
    }

    unobserve(attribute, fn) {
        if (isString(attribute) || isNumber(attribute)) {
            return unobserveProp(this, attribute, fn);
        }
        return super.unobserve(attribute, fn);
    }

    compute(attribute, calc) {
        if (isString(attribute) || isNumber(attribute)) {
            return compute((cb) => {
                this.observe(attribute, cb);
                return () => this.unobserve(attribute, cb);
            }, calc, this.get(attribute));
        }
        return super.compute(attribute);
    }

    size() {
        return this.state.data.length;
    }

    map(fn) {
        return arrayUtils.map(this.state.data, fn);
    }

    indexOf(key, val) {
        if (isObservable(key)) {
            var length = this.length;
            var i = -1;
            while (++i < length) {
                if (this[i] === key) {
                    return i;
                }
            }
            return -1;
        } else {
            return arrayUtils.indexOf(this.state.data, key, val);
        }
    }

    lastIndexOf(key, val) {
        return isObservable(key)
            ? Array.prototype.lastIndexOf.call(this, key)
            : arrayUtils.lastIndexOf(this.state.data, key, val);
    }

    getOrCreate(obj) {
        var index = arrayUtils.indexOf(this.state.data, obj);
        return index !== -1 ? this[index] : this.add(obj);
    }

    get(i) {
        if (i == null) return this.state.data;
        return this[i].get();
    }

    set(array) {
        if (!array || array.length == 0) {
            this.clear();
        } else {
            var modelsLen = this.length;

            collectionWillUpdate(this);

            if (array.length < modelsLen) {
                this.splice(array.length, modelsLen - array.length);
            }

            var i = 0;
            var isChange = false;

            this.each(function (model) {
                const item = getRelObserverOrSelf(array[i]);

                if (isObservable(item)) {
                    if (item != model) {
                        isChange = true;
                        disconnect(this, model);
                        connect(this, item, i);

                        this[i] = item;
                        this.state.data[i] = item.state.data;
                    }
                } else {
                    renewSet(model, true, item);
                    if (model.state.changed) {
                        isChange = true;
                    }
                }

                i++;
            });

            if (isChange) this.state.changed = true;

            this.add(i == 0 ? array : array.slice(i, array.length));

            collectionDidUpdate(this);
        }
        return this;
    }

    add(array) {
        collectionWillUpdate(this);

        var model;
        var dataIsArray = isArray(array);

        if (!dataIsArray) {
            array = [array];
        }
        var dataLen = array.length;
        var results = [];

        if (dataLen) {
            for (var i = 0; i < dataLen; i++) {
                var dataItem = array[i];
                var index = this.length;

                model = connectItem(this, dataItem, index);

                this[index] = model;
                this.state.data[index] = model.state.data;

                this.length++;

                results.push(model);
            }

            this.state.changed = true;
        }

        collectionDidUpdate(this);

        return dataIsArray ? results : results[0];
    }

    /**
     * 更新collection中的所有item
     * collection.updateAll({ name: '更新掉name' })
     *
     * @param {Object} data
     *
     * @return {Collection} self
     */
    updateAll(data) {
        collectionWillUpdate(this);
        var array = this.state.data;
        for (var i = 0; i < array.length; i++) {
            this[i].set(data);
            if (this[i].state.changed) {
                this.state.changed = true;
            }
        }
        return collectionDidUpdate(this);
    }

    /**
     * 根据 comparator 更新Model，不在collection中的将会追加到尾部
     * collection.update([{ id: 123 name: '更新掉name' }], 'id')
     *
     * @param {String} comparator 属性名/比较方法
     * @param {Object} data
     * @param {Object} renewItem 是否覆盖匹配项
     *
     * @return {Collection} self
     */
    update(arr, comparator, renewItem = false) {
        return update(this, arr, comparator, true, renewItem);
    }

    /**
     * 根据 comparator 更新Model
     * collection.updateBy('id', { id: 123 name: '更新掉name' })
     * collection.updateBy('id', [{ id: 123 name: '更新掉name' }])
     *
     * @param {String} comparator 属性名/比较方法
     * @param {Object} data
     * @param {Object} renewItem 是否覆盖匹配项
     *
     * @return {Collection} self
     */
    updateBy(comparator, data, renewItem = false) {
        return update(this, data, comparator, false, renewItem, true);
    }

    /**
     * 更新为传入的数组
     * @param {*} arr
     * @param {*} comparator
     */
    updateTo(arr, comparator) {
        if (!arr) return this;

        let fn;
        let length = this.length;

        if (!length) {
            this.add(arr);
            return this;
        }

        collectionWillUpdate(this);

        if (isString(comparator)) {
            fn = function (a, b) {
                return a[comparator] == b[comparator];
            };
        } else fn = comparator;

        const arrayLength = arr.length;

        for (let i = 0; i < arrayLength; i++) {
            const arrItem = arr[i];
            let item,
                index = -1,
                j;

            for (j = i; j < length; j++) {
                const data = this.state.data[j];
                if (fn.call(this, data, arrItem)) {
                    item = this[j];
                    index = j;
                    break;
                }
            }

            if (index === -1) {
                item = connectItem(this, arrItem, i);
            } else {
                renewSet(item, true, arrItem);
                if (this[i].state.changed) {
                    this.state.changed = true;
                }
            }

            if (i !== index) {
                if (index === -1) {
                    this.state.data.push(this[i].state.data);
                    this[length] = this[i];
                    length++;
                } else {
                    this[index] = this[i];
                }
                this[i] = item;
                this.state.data[i] = item.state.data;
                setMapper(this, this[i], i);
                this.state.changed = true;
            }
        }

        if (arrayLength < length) {
            for (let i = arrayLength; i < length; i++) {
                delete this[i];
            }
        }
        if (this.state.data.length != arrayLength) {
            this.state.data.length = arrayLength;
        }
        this.length = arrayLength;

        return collectionDidUpdate(this);
    }

    unshift(data) {
        return this.insert(0, data);
    }

    insert(index, data) {
        if (!isArray(data)) {
            data = [data];
        }

        this.splice(index, 0, data);

        return this;
    }

    swap(aIndex, bIndex) {
        collectionWillUpdate(this);
        const a = this[aIndex];
        const b = this[bIndex];

        this[aIndex] = b;
        this[bIndex] = a;

        setMapper(this, b, aIndex);
        setMapper(this, a, bIndex);

        this.state.data[aIndex] = b.state.data;
        this.state.data[bIndex] = a.state.data;
        this.state.changed = true;
        return collectionDidUpdate(this);
    }

    splice(start, count, array) {
        if (!count && !array) return [];

        collectionWillUpdate(this);

        var spliced = [];
        var arrayLength = array ? array.length : 0;
        var offset = arrayLength - count;
        var i;
        var offsetIndex;
        var length;
        var item;
        var model;
        var end = start + count;
        var newLength;

        if (count) {
            for (i = start; i < end; i++) {
                spliced.push(this[i]);
                disconnect(this, this[i]);
            }
        }

        if (offset > 0) {
            i = this.length;
            while (--i >= end) {
                offsetIndex = offset + i;
                setMapper(this, this[offsetIndex] = this[i], offsetIndex);
                this.state.data[offsetIndex] = this.state.data[i];
            }
        } else if (offset < 0) {
            i = end - 1;
            length = this.length;
            newLength = length + offset;

            while (++i < length) {
                offsetIndex = offset + i;
                setMapper(this, this[offsetIndex] = this[i], offsetIndex);
                this.state.data[offsetIndex] = this.state.data[i];
                if (i >= newLength) {
                    delete this[i];
                }
            }
            this.state.data.splice(newLength, this.length - newLength);
        }
        this.length += offset;

        i = -1;
        while (++i < arrayLength) {
            item = array[i];
            offsetIndex = start + i;

            model = connectItem(this, item, offsetIndex);

            this[offsetIndex] = model;
            this.state.data[offsetIndex] = model.state.data;
        }

        this.state.changed = true;
        collectionDidUpdate(this);
        return spliced;
    }

    /**
     * 移除Model
     *
     * @param {String|Model|Function|array} key 删除条件，(arrayItem)=>boolean
     * @param {any} [val]
     */
    remove(key, val) {
        collectionWillUpdate(this);

        var array = this.state.data;
        var fn = isArray(key)
            ? (item, i) => key.indexOf(this[i]) !== -1
            : isObservable(key)
                ? (item, i) => this[i] === key
                : matcher(key, val);
        var removed = [];
        var length = this.length;
        var i = -1;
        var index = -1;
        var prevIndex = -1;
        var newLength;

        while (++i < length) {
            if (fn.call(this, array[i], i)) {
                removed.push(this[i]);
                disconnect(this, this[i]);
                delete this[i];
                if (index === -1) {
                    this.state.changed = true;
                    index = i;
                }
            }
        }

        if (index !== -1) {
            i = index - 1;
            newLength = length - removed.length;
            while (++i < length) {
                if (this[i] === undefined) {
                    if (prevIndex === -1) {
                        prevIndex = i;
                    }
                } else {
                    setMapper(this, this[prevIndex] = this[i], prevIndex);
                    this.state.data[prevIndex] = this.state.data[i];
                    if (i >= newLength)
                        delete this[i];
                    prevIndex++;
                }
            }
            this.state.data.splice(newLength, this.length - newLength);
            this.length = newLength;
        }

        collectionDidUpdate(this);

        return removed;
    }

    clear() {
        if (this.length == 0 && this.state.data.length == 0) return this;
        for (var i = 0; i < this.length; i++) {
            disconnect(this, this[i]);
            delete this[i];
        }
        this.state.data = [];
        this.length = 0;
        this.state.setting = 1;
        this.state.changed = true;

        return collectionDidUpdate(this);
    }

    each(start, end, fn) {
        if (typeof start == 'function') {
            fn = start;
            start = 0;
            end = this.length;
        } else if (typeof end == 'function') {
            fn = end;
            end = this.length;
        }

        this.state.inEach = true;
        this.state.arrayIsNew = false;
        for (; start < end; start++) {
            if (fn.call(this, this[start], start) === false) break;
        }

        this.state.inEach = false;
        if (this.state.arrayIsNew) {
            freezeObject(this.state.data, this);
            this.state.arrayIsNew = false;
        }

        return this;
    }

    forEach(fn) {
        this.state.data.forEach(fn, this);
    }

    find(key, val) {
        var iterate = matcher(key, val);
        var array = this.state.data;
        var length = array.length;

        for (var i = 0; i < length; i++) {
            if (iterate(array[i], i)) return this[i];
        }
        return null;
    }

    findAt(keys, val) {
        var length = keys.length;
        var result;
        var interate = isFunction(val)
            ? val
            : (item) => contains(item, val);

        this.each((item) => {
            var i = -1;
            while (++i < length) {
                var name = keys[i];
                var model = item._(name);
                if (i + 2 >= length) {
                    var next = keys[i + 1];
                    var value = isObservable(model) ? model.get(next) : model;
                    if (interate(value)) {
                        result = model;
                        return false;
                    }
                } else if (isCollection(model)) {
                    result = model.findAt(keys.slice(i + 1), val);
                    return result != null;
                }
            }
        });

        return null;
    }

    filter(key, val) {
        var iterate = matcher(key, val);
        var result = [];
        var array = this.state.data;
        var length = array.length;

        for (var i = 0; i < length; i++) {
            if (iterate(array[i], i))
                result.push(this[i]);
        }

        return result;
    }

    last() {
        return this.length === 0 ? null : this[this.length - 1];
    }

    sort(fn) {
        var n = this.state.data.length;
        if (n === 0) return this;

        collectionWillUpdate(this);

        var i = 0;
        for (; i < n; i++) {
            this[i].$i = i;
        }
        Array.prototype.sort.call(this, function (a, b) {
            return fn(a.state.data, b.state.data) || a.$i - b.$i;
        });

        for (i = 0; i < n; i++) {
            if (this.state.data[i] != this[i].state.data) {
                this.state.data[i] = this[i].state.data;
                setMapper(this, this[i], i);
                this.state.changed = true;
            }
        }

        return collectionDidUpdate(this);
    }

    toJSON() {
        return extend(true, [], this.state.data);
    }
}

Collection.prototype.toArray = Collection.prototype.toJSON;

Collection.prototype[TYPEOF] = 'Collection';


// setTimeout(() => {
//     const test = new Collection([{
//         id: 1,
//         name: 'a',
//         ext: 'x1'
//     }, {
//         id: 2,
//         name: 'b',
//         ext: 'x2'
//     }, {
//         id: 2,
//         name: 'b',
//         ext: 'x2'
//     }, {
//         id: 3,
//         name: 'b',
//         ext: 'x2'
//     }, {
//         id: 4,
//         name: 'b',
//         ext: 'x2'
//     }]);

//     console.log(test.array);

//     test.updateTo([{ id: 3, name: 'b' }], 'id');

//     console.log(test, test.array);

//     test.updateTo([{ id: 1, name: 'b' }, { id: 2, name: 'c' }, { id: 3, name: 'e' }], 'id');

//     console.log(test, test.array);

//     let a = test.splice(0, 1);

//     console.log('unshift');

//     test.unshift(a);

//     a = test.splice(1, 1);

//     test.unshift(a);

//     console.log(test, a);
// }, 0);