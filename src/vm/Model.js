/* eslint-disable max-statements */
import { isBoolean, isArray, isPlainObject, isThenable, isString } from '../utils/is';
import { extend, deepClone } from '../utils/clone';
import { get } from '../utils/object';

import { Observer } from './Observer';
import { Collection } from './Collection';

import { isModel, isCollection, isObservable, TYPEOF } from './predicates';

import { enqueueUpdate } from './methods/enqueueUpdate';
import { blindSet } from './methods/blindSet';
import { updateRefs } from './methods/updateRefs';
import { connect, disconnect, freezeObject } from './methods/connect';
import { observable } from './observable';
import { observeProp, unobserveProp } from './methods/observeProp';
import compute from './operators/compute';
import { SymbolObserver, SymbolFrom } from './symbols';

const toString = Object.prototype.toString;
const RE_QUERY = /(?:^|\.)([_a-zA-Z0-9]+)(\[(?:'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^\]])+\](?:\[[+-]?\d*\])?)?/g;

export class Model extends Observer {
    static createAttribute(parent, name, value) {
        if (isPlainObject(value)) {
            return new Model(value, name, parent);
        } else if (isArray(value)) {
            return new Collection(value, name, parent);
        } else {
            return value;
        }
    }

    constructor(attributes, key?, parent?) {
        if (process.env.NODE_ENV !== 'production') {
            if (attributes && (attributes[SymbolObserver] || attributes instanceof Observer)) {
                throw new Error('attributes can not be Observer!');
            }
        }
        super();
        this.state.initialized = false;
        this.state.observableProps = {};

        if (parent) {
            connect(parent, this, key);
        }

        const defaultAttributes = this.constructor.defaultAttributes;
        if (attributes !== undefined || defaultAttributes !== undefined) {
            attributes = attributes === undefined
                ? defaultAttributes
                : isPlainObject(defaultAttributes)
                    ? Object.assign({}, defaultAttributes, attributes)
                    : attributes;

            this.set(attributes);
        }
        this.state.initialized = true;
    }

    get attributes() {
        return this.state.data;
    }

    set attributes(val) {
        this.set(true, val);
    }

    /**
     * 搜索子Model/Collection，
     * 支持多种搜索条件
     *
     * 搜索子Model:
     * model._('user') 或 model._('user.address')
     *
     * 根据查询条件查找子Collection下的Model:
     * model._('collection[id=222][0].options[text~="aa"&value="1"][0]')
     * model._('collection[id=222][0].options[text~="aa"&value="1",attr^='somevalue'|attr=1][0]')
     *
     * 且条件:
     * model._("collection[attr='somevalue'&att2=2][1].aaa[333]")
     *
     * 或条件:
     * model._("collection[attr^='somevalue'|attr=1]")
     *
     * 不存在时添加，不可用模糊搜索:
     * model._("collection[attr='somevalue',attr2=1][+]")
     *
     * @param {string} search 搜索条件
     * @param {any} [def] collection[attr='val'][+]时的默认值
     */
    _(search, def) {
        var attr;
        var query;
        var result = this;

        RE_QUERY.lastIndex = 0;
        for (var m = RE_QUERY.exec(search); m; m = RE_QUERY.exec(search)) {
            attr = m[1];
            query = m[2];

            if (isModel(result)) {
                result = result.state.observableProps[attr] || (result.state.data != null ? result.state.data[attr] : undefined);

                if (query && isCollection(result)) {
                    return result._(query + search.substr(m.index + m[0].length), def);
                }
            }
            else if (!result)
                return def === undefined ? null : def;
            else
                result = result[attr];
        }
        return !result && def !== undefined ? def : result;
    }

    pick(keys) {
        return keys
            ? keys.reduce((result, key) => {
                result[key] = this.get(key);
                return result;
            }, {})
            : {};
    }

    get(key) {
        const { data } = this.state;
        if (key == null) return data;
        if (!data) return undefined;
        return get(data, key);
    }

    /**
     * 设置Model
     *
     * 参数: [renew, Object] | [renew, key, val] | [key, val] | [Object]
     * [renew, key, val] 替换子model数据
     * [renew, Object] 时覆盖当前model数据
     *
     * @param {Boolean} [renew] 是否替换掉现有数据
     * @param {String|Object} key 属性名
     * @param {any} [val] 属性值
     */
    set(renew, key, val) {
        let model,
            attrs,
            keys,
            renewChild = false,
            argsLength = arguments.length,
            keyIsVal;

        if (!isBoolean(renew) || argsLength === 1) {
            val = key;
            key = renew;
            renew = false;
            keyIsVal = argsLength === 1;
        } else {
            keyIsVal = argsLength === 2;
        }

        const keyType = toString.call(key);
        const keyIsObject = keyType === '[object Object]';
        const { state } = this;

        if (keyIsVal && (!keyIsObject || !isPlainObject(key))) {
            if (state.changed = (state.data !== key)) {
                state.observableProps = {};
                state.data = key;
                enqueueUpdate(this);
                updateRefs(this);
            }
            return this;
        } else if (keyIsObject) {
            attrs = key;
        } else {
            keys = keyType === '[object Array]' ? key : key.replace(/\[(\d+)\]/g, '.[$1]')
                .split('.')
                .filter((name) => name);

            if (keys.length > 1) {
                model = blindSet(this, renew, keys, val);

                return (state.changed = model.state.changed)
                    ? enqueueUpdate(this)
                    : this;
            } else {
                renewChild = renew;
                renew = false;
                (attrs = {})[key] = val;
            }
        }

        const oldAttributes = state.data;
        const attributes = {};
        const removeKeys = [];
        let isChange = false;

        if (oldAttributes === null || !isPlainObject(oldAttributes)) {
            isChange = true;
        } else {
            for (let name in oldAttributes) {
                attributes[name] = oldAttributes[name];
                if (renew && attrs[name] === undefined) {
                    removeKeys.push(name);
                }
            }
        }

        state.data = attributes;
        state.setting = true;

        const changes = [];
        const observableProps = state.observableProps;
        const setAttr = (attr) => {
            const origin = observableProps[attr] || attributes[attr];
            let value = attrs[attr];
            if (value && value[SymbolObserver] && value['[[ConnectModel]]'] !== false) {
                value = value[SymbolObserver];
            }

            if (origin !== value) {
                if (value == null) {
                    changes.push(attr, value, attributes[attr]);
                    attributes[attr] = observableProps[attr] = value;
                    if (isObservable(origin)) {
                        disconnect(this, origin);
                    }
                    isChange = true;
                } else if (isObservable(value)) {
                    changes.push(attr, value.state.data, attributes[attr]);
                    observableProps[attr] = value;
                    attributes[attr] = value.state.data;

                    if (isObservable(origin)) {
                        disconnect(this, origin);
                    }
                    connect(this, value, attr);

                    isChange = true;
                } else if (isModel(origin)) {
                    if (origin.state.facade && !isPlainObject(value)) {
                        throw new Error('不可改变' + attr + '的数据类型');
                    }
                    origin.set(renew || renewChild, value);
                    attributes[attr] = origin.state.data;

                    if (origin.state.changed) isChange = true;
                } else if (isCollection(origin)) {
                    if (!isArray(value)) {
                        if (value == null) {
                            value = [];
                        } else {
                            throw new Error('[Array to ' + (typeof value) + ' error]不可改变' + attr + '的数据类型');
                        }
                    }

                    origin.set(value);
                    attributes[attr] = origin.state.data;

                    if (origin.state.changed) isChange = true;
                } else if (isObservable(origin)) {
                    origin.set(value);
                    attributes[attr] = origin.state.data;

                    if (origin.state.changed) isChange = true;
                } else if (isThenable(value)) {
                    value.then(((attr, res) => {
                        this.set(renew, attr, res);
                    }).bind(this, attr));
                } else {
                    value = createAttribute(this, attr, value);
                    if (isObservable(value)) {
                        changes.push(attr, value.state.data, attributes[attr]);
                        observableProps[attr] = value;
                        attributes[attr] = value.state.data;
                    } else {
                        changes.push(attr, value, attributes[attr]);
                        attributes[attr] = value;
                    }
                    isChange = true;
                }
            }
        };

        for (let attr in attrs) {
            if (attr === 'constructor' && typeof attrs[attr] === 'function') {
                continue;
            }
            if (attr === '__proto__' || attr === 'withMutations' || attr === SymbolFrom) {
                continue;
            }
            setAttr(attr);
        }

        for (let i = 0; i < removeKeys.length; i++) {
            setAttr(removeKeys[i]);
        }

        if (isChange) {
            freezeObject(attributes, this);
            enqueueUpdate(this);
            updateRefs(this);
            if (state.hasOnAttrChangeListener) {
                for (var i = 0, length = changes.length; i < length; i += 3) {
                    this.trigger("change:" + changes[i], changes[i + 1], changes[i + 2]);
                }
            }
        } else {
            state.data = oldAttributes;
        }
        state.setting = false;
        state.changed = isChange;

        return this;
    }

    restore() {
        this.attributes = this.constructor.defaultAttributes;
    }

    collection(key) {
        !key && (key = 'collection');

        var result = this._(key);
        if (result == null) {
            this.set(key, []);
            return this.state.observableProps[key];
        }
        return result;
    }

    model(key) {
        if (!this.state.observableProps[key]) this.set(key, {});
        return this.state.observableProps[key];
    }

    observable(key) {
        const { observableProps, data } = this.state;

        if (observableProps[key]) return observableProps[key];

        var value = data == null ? undefined : data[key];
        const observer = observable(value);
        this.set(key, observer);
        return observer;
    }

    on(type, fn) {
        if (/(^|\s)change:/.test(type)) {
            this.state.hasOnAttrChangeListener = true;
        }
        return super.on(type, fn);
    }

    /**
     * 监听当前 Model 的属性值变化
     */
    observe(attribute, fn) {
        if (isString(attribute)) {
            if (fn) {
                const cb = (e, newValue, oldValue) => {
                    if (e.target === this) {
                        return fn.call(this, newValue, oldValue);
                    }
                };
                cb._cb = fn;
                this.on(parseChanges(attribute), cb);
            }
            return observeProp(this, attribute, fn);
        }
        return super.observe(attribute);
    }

    unobserve(attribute, fn) {
        if (isString(attribute)) {
            this.off(parseChanges(attribute), fn);
            return unobserveProp(this, attribute, fn);
        }
        return super.unobserve(attribute);
    }

    compute(attribute, calc) {
        if (isString(attribute)) {
            return compute(this.get(attribute), (cb) => {
                this.observe(attribute, cb);
                return () => this.unobserve(attribute, cb);
            }, calc);
        }
        return super.compute(attribute);
    }

    getJSON(key) {
        return deepClone(this.get(key));
    }

    toJSON() {
        return extend(true, {}, this.state.data);
    }

    destroy() {
        super.destroy();

        if (this.state.observableProps) {
            for (var key in this.state.observableProps) {
                var model = this.state.observableProps[key];
                if (model) {
                    disconnect(this, model);
                }
            }
            this.state.observableProps = null;
        }
    }
}

Model.prototype[TYPEOF] = 'Model';


function createAttribute(model, name, value) {
    return model.constructor.createAttribute(model, name, value);
}

function parseChanges(attrs) {
    return "change" + attrs
        .split(/\s+/)
        .filter(name => !!name)
        .map(name => ':' + name)
        .join(' change');
}

if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
        const model = new Model();

        model.set(null);
        console.assert(model.attributes === null, 'model.attributes must be null, now is ' + model.attributes);
        console.assert(model.valueOf() === null, 'model.valueOf() must be null, now is ' + model.valueOf());
        console.assert(model + '' === 'null', 'model.toString() must be `null`, now is ' + model.toString());

        model.set(true);
        console.assert(model.attributes === true, 'model.attributes must be true, now is ' + model.attributes);
        console.assert(model.valueOf() === true, 'model.valueOf() must be true, now is ' + model.valueOf());
        console.assert(model + '' === 'true', 'model.toString() must be `true`, now is ' + model.toString());

        model.set(false);
        console.assert(model.attributes === false, 'model.attributes must be false, now is ' + model.attributes);
        console.assert(model.valueOf() === false, 'model.valueOf() must be false, now is ' + model.valueOf());
        console.assert(model + '' === 'false', 'model.toString() must be `false`, now is ' + model.toString());

        model.set(undefined);
        console.assert(model.attributes === undefined, 'model.attributes must be undefined, now is ' + model.attributes);
        console.assert(model.valueOf() === undefined, 'model.valueOf() must be undefined, now is ' + model.valueOf());
        console.assert(model + '' === 'undefined', 'model.toString() must be `undefined`, now is ' + model.toString());

        model.set(0);
        console.assert(model.attributes === 0, 'model.attributes must be 0, now is ' + model.attributes);
        console.assert(model.valueOf() === 0, 'model.valueOf() must be 0, now is ' + model.valueOf());
        console.assert(model + '' === '0', 'model.toString() must be `0`, now is ' + model.toString());
        console.assert(model + 5 === 5, 'model + 5 must be `5`, now is ' + model.toString());

        model.set(1);
        console.assert(model.attributes === 1, 'model.attributes must be 0, now is ' + model.attributes);
        console.assert(model.valueOf() === 1, 'model.valueOf() must be 0, now is ' + model.valueOf());
        console.assert(model + '1' === '11', 'model + "1" must be `11`, now is ' + (model + '1'));
        console.assert(model + 5 === 6, 'model + 6 must be `6`, now is ' + (model + 5));

        model.set({
            name: 1
        });
        console.assert(model.attributes.name === 1, 'model.attributes.name must be 1, now is ' + model.attributes);

        model.set({
            name: {
                id: 1
            }
        });
        console.assert(model.attributes.name.id === 1, 'model.attributes.name.id must be 1, now is ' + model.attributes);

        model.set({
            name: null
        });
        console.assert(model.attributes.name === null, 'model.attributes.name must be null, now is ' + model.attributes);
    }, 0);
}