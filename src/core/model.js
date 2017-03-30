define(function (require, exports, module) {
    var $ = require('$'),
        util = require('util'),
        Event = require('./event'),
        Component = require('./component');

    var toString = {}.toString;

    var eventsCache = [];
    var changeEventsTimer;
    var elementId = 0;

    var snEvents = {
        tap: 'tap',
        click: 'click',
        change: 'change',
        focus: 'focus',
        blur: 'blur',
        'transition-end': $.fx.transitionEnd
    };
    var snGlobal = ['this', '$', 'Math', 'new', 'Date', 'encodeURIComponent', 'window', 'document'];

    var rfilter = /\s*\|\s*([a-zA-Z_0-9]+)((?:\s*(?:\:|;)\s*\({0,1}\s*([a-zA-Z_0-9\.-]+|'(?:\\'|[^'])*')\){0,1})*)/g;
    var rparams = /\s*\:\s*([a-zA-Z_0-9\.-]+|'(?:\\'|[^'])*')/g;
    var rvalue = /^((-)*\d+|true|false|undefined|null|'(?:\\'|[^'])*')$/;
    var rrepeat = /([a-zA-Z_0-9]+)(?:\s*,(\s*[a-zA-Z_0-9]+)){0,1}\s+in\s+([a-zA-Z_0-9]+(?:\.[a-zA-Z_0-9]+){0,})(?:\s*\|\s*filter\s*\:\s*(.+?)){0,1}(?:\s*\|\s*orderBy\:(.+)){0,1}(\s|$)/;
    var rmatch = /\{\{(.+?)\}\}(?!\})/g;
    var rvar = /'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/[img]*(?=[\)|\.|,])|\/\/.*|\bvar\s+[_,a-zA-Z0-9]+\s*\=|(^|[\!\=\>\<\?\s\:\(\),\%&\|\+\-\*\/\[\]]+)([\$a-zA-Z_][\$a-zA-Z_0-9]*(?:\.[a-zA-Z_0-9]+)*(?![a-zA-Z_0-9]*\())/g;
    var rset = /([a-zA-Z_0-9]+(?:\.[a-zA-Z_0-9]+)*)\s*=\s*((?:\((?:'(?:\\'|[^'])*'|[^\)])+\)|'(?:\\'|[^'])*'|[^;])+?)(?=\;|\,|$)/g;
    var rthis = /\b((?:this\.){0,1}[\.\w]+\()((?:'(?:\\'|[^'])*'|[^\)])*)\)/g;

    var withData = function (repeat, content) {
        var code = 'var $el=$(el),root=model.root,$data=$.extend({},global,root.data,{$state:root.$state.data}';
        if (repeat) {
            code += ',{';
            for (var parent = repeat.parent, current = repeat; parent != null; current = parent, parent = parent.parent) {
                code += parent.alias + ':' + (current.isChild ? 'model.closest(\'' + parent.collectionName + '^child\').data' : 'root.upperRepeatEl(el,function(el){ if (el.snRepeat.repeat.alias == "' + parent.alias + '") return el.snModel.data; },null)') + ',';

                if (parent.indexAlias) {
                    code += parent.indexAlias + ':function(){ for (var node=el;node!=null;node=node.parentNode) { if (node.snIndexAlias=="' + parent.indexAlias + '") return node.snIndex } return ""},';
                }
            }
            code += repeat.alias + ':model.data';

            if (repeat.indexAlias) {
                code += ',' + repeat.indexAlias + ':function(){ for (var node=el;node!=null;node=node.parentNode) { if (node.snIndexAlias=="' + repeat.indexAlias + '") return node.snIndex }return ""}';
            }
            code += '}';
        }

        code += ');with($data){' + content + '}';

        return code;
    }

    var isNull = function (str) {
        var arr = str.split('.');
        var result = [];
        var code = '';
        var gb = arr[0] == '$state' ? arr.shift() : '$data';

        for (var i = 0; i < arr.length; i++) {
            result[i] = (i == 0 ? gb : result[i - 1]) + '.' + arr[i];
        }
        for (var i = 0; i < result.length; i++) {
            code += (i ? '&&' : '') + result[i] + '!==null&&' + result[i] + '!==undefined';
        }
        return '((' + code + ')?typeof ' + str + '==="function"?' + str + '():' + str + ':"")';
    }

    var eachElement = function (el, fn, extend) {

        var childNodes = el.length ? el : [el];

        for (var i = 0, len = childNodes.length; i < len; i++) {
            var child = childNodes[i];
            var nextExtend = fn(child, i, extend);

            if (nextExtend !== false && child.nodeType == 1 && child.childNodes.length) {
                eachElement(child.childNodes, fn, nextExtend);
            }
        }
    }

    var Filters = {
        contains: function (source, keywords) {
            return source.indexOf(keywords) != -1;
        },
        like: function (source, keywords) {
            source = source.toLowerCase();
            keywords = keywords.toLowerCase();
            return source.indexOf(keywords) != -1 || keywords.indexOf(source) != -1;
        },
        util: util
    };

    var Model = function (parent, key, data) {

        if (parent instanceof Model) {
            this.key = parent.key ? parent.key + '.' + key : key;

        } else if (parent instanceof Collection) {
            this.key = parent.key + '^child';

        } else {
            throw new Error('Model\'s parent mast be Collection or Model');
        }

        this.type = typeof data == 'object' ? 'object' : 'value';
        parent.data[key] = this.data = this.type == 'object' ? $.extend({}, data) : data;

        this._key = key;
        this.model = {};
        this.parent = parent;
        this.root = parent.root;
        this._elements = {};

        this._collectionItemInitSet = this.parent instanceof Collection;
        this.set(data);
        this._collectionItemInitSet = false;

    }
    var ModelProto = {
        getModel: function (key) {
            if (typeof key == 'string' && key.indexOf('.') != -1) {
                key = key.split('.');
            }
            if ($.isArray(key)) {
                var model = this;
                if (key[0] == 'this') {
                    for (var i = 1, len = key.length; i < len; i++) {
                        if (!(model = model[key[i]]))
                            return null;
                    }
                } else {
                    for (var i = 0, len = key.length; i < len; i++) {
                        if (model instanceof Model)
                            model = model.model[key[i]];
                        else if (model instanceof Collection)
                            model = model.models[key[i]];
                        else
                            return null;
                    }
                }
                return model;
            }
            return key == 'this' ? this : key == '' ? this.data : this.model[key];
        },
        get: function (key) {
            if (typeof key == 'string' && key.indexOf('.') != -1) {
                key = key.split('.');
            }
            if ($.isArray(key)) {
                var data = this.data;

                for (var i = key[0] == 'this' ? 1 : 0, len = key.length; i < len; i++) {
                    if (!(data = data[key[i]]))
                        return null;
                }
                return data;
            }
            return key == 'this' ? this : key == '' ? this.data : this.data[key];
        },

        cover: function (key, val) {
            return this.set(true, key, val);
        },

        _fixParentData: function () {
            var parent = this.parent;
            parent.data[(parent instanceof Collection) ? parent.models.indexOf(this) : this._key] = this.data;
        },

        set: function (cover, key, val) {
            var self = this,
                origin,
                changed,
                attrs,
                model = self.model,
                parent,
                keys,
                coverChild = false,
                shouldTriggerEvent = !this.root._initSet && !this._collectionItemInitSet;

            if (typeof cover != "boolean")
                val = key, key = cover, cover = false;

            if (typeof key == 'object') {
                attrs = key;
            } else if (key === null) {
                !cover && (cover = true);
                attrs = {};

            } else if (typeof val == 'undefined') {
                val = key, key = '', parent = this.parent;

                this.data = val;
                this._fixParentData();

                shouldTriggerEvent && this.root._triggerChangeEvent(this.key, this);

                return this;

            } else {
                keys = key.split('.');

                if (keys.length > 1) {
                    var lastKey = keys.pop();
                    for (var i = 0, len = keys.length; i < len; i++) {
                        key = keys[i];

                        if (!(model[key] instanceof Model)) {
                            model = model[key] = new Model(this, key, {});
                        } else {
                            model = model[key];
                        }
                    }
                    model.set(cover, lastKey, val);
                    return;

                } else {
                    coverChild = cover;
                    cover = false;
                    (attrs = {})[key] = val;
                }
            }
            if (!$.isPlainObject(this.data)) this.data = {}, this._fixParentData();

            if (cover) {
                for (var attr in this.data) {
                    if (attrs[attr] === undefined) {
                        attrs[attr] = null;
                    }
                }
            }

            for (var key in attrs) {
                this.data[key] = attrs[key];
            }
            var eventName;

            for (var attr in attrs) {
                origin = model[attr];
                value = attrs[attr];
                eventName = this.key ? this.key + '/' + attr : attr;

                if (origin !== value) {

                    if (origin instanceof Model) {

                        value === null || value === undefined ? origin.reset() : origin.set(coverChild, value);
                        this.data[attr] = origin.data;

                    } else if (origin instanceof Collection) {
                        if (!$.isArray(value)) {
                            if (value == null) {
                                value = [];
                            } else {
                                throw new Error('[Array to ' + (typeof value) + ' error]不可改变' + attr + '的数据类型');
                            }
                        }
                        origin.set(value);
                        this.data[attr] = origin.data;

                    } else {

                        switch (toString.call(value)) {
                            case '[object Object]':
                                model[attr] = new Model(this, attr, value);
                                break;
                            case '[object Array]':
                                model[attr] = new Collection(this, attr, value);
                                break;
                            default:
                                model[attr] = value;
                                shouldTriggerEvent && this.root._triggerChangeEvent(eventName, this);
                                break;
                        }
                    }
                }
            }

            shouldTriggerEvent && this.root._triggerChangeEvent(this.key, this);

            return self;
        },

        reset: function () {

            var data = {};
            for (var attr in this.data) {
                data[attr] = null;
            }
            this.set(data);
        },
        closest: function (key) {
            var res;
            for (var parent = this.parent; parent != null; parent = parent.parent) {
                res = typeof key == 'function' ? key(parent) : (parent.key == key ? 1 : 0);
                if (res) {
                    return parent;
                } else if (res === false) {
                    return null;
                }
            }
        },
        contains: function (model, excludeCollection) {
            for (model = model.parent; model != null; model = model.parent) {
                if (model == this) {
                    return true;
                } else if (excludeCollection && model instanceof Collection)
                    return false;
            }
            return false;
        },

        under: function (parent) {
            for (var model = this.parent; model != null && parent != model; model = model.parent) {
                if (model instanceof Collection) {
                    return false;
                }
            }
            return true;
        },

        _pushNode: function (source, node) {
            var id = source.snElementId || (source.snElementId = ++elementId);

            (this._elements[id] || (this._elements[id] = [])).push(node);
        }
    }
    ModelProto.clear = ModelProto.reset;

    Event.mixin(Model, ModelProto);

    var Collection = Event.mixin(function (parent, attr, data) {

        this.models = [];

        this.parent = parent;
        this.key = parent.key ? (parent.key + "." + attr) : attr;
        this._key = attr;
        this.eventName = this.key.replace(/\./g, '/')

        this.root = parent.root;

        this.data = [];
        parent.data[attr] = this.data;

        this.add(data);

    }, {
            _triggerChangeEvent: function () {
                if (!this._silent) {
                    this.root._triggerChangeEvent(this.key, this)
                        ._triggerChangeEvent(this.key + '/length', this);
                }
            },

            get: function (i) {
                return this.models[i];
            },
            set: function (data) {
                this._silent = true;

                if (!data || data.length == 0) {
                    this.clear();

                } else {
                    var modelsLen = this.models.length;

                    if (data.length < modelsLen) {
                        this.remove(data.length, modelsLen - data.length)
                    }

                    var i = 0;
                    this.each(function (model) {
                        model.set(true, data[i]);
                        i++;
                    });

                    this.add(i == 0 ? data : data.slice(i, data.length));
                }
                this._silent = false;

                this._triggerChangeEvent();

                return this;
            },
            each: function (fn) {
                for (var i = 0; i < this.models.length; i++) {
                    if (fn.call(this, this.models[i], i) === false) break;
                }
                return this;
            },
            first: function (fn) {
                for (var i = 0; i < this.models.length; i++) {
                    if (fn.call(this, this.data[i], i)) {
                        return this.models[i];
                    }
                }
                return null;
            },
            add: function (data) {
                var model;
                var length;
                var changes = [];

                if (!$.isArray(data)) {
                    data = [data];
                }

                for (var i = 0, dataLen = data.length; i < dataLen; i++) {
                    var dataItem = data[i];
                    length = this.models.length;
                    model = new Model(this, length, dataItem);
                    this.models.push(model);
                    changes.push(model);

                    this.trigger('add', model);
                }

                this.root.trigger('change:' + this.eventName + '/add', this, changes);

                this._triggerChangeEvent();
            },
            remove: function (start, count) {
                var models;

                if (typeof start == 'function') {
                    models = [];
                    for (var i = this.models.length - 1; i >= 0; i--) {
                        if (start.call(this, this.data[i], i)) {
                            models.push(this.models.splice(i, 1)[0]);
                            this.data.splice(i, 1);
                        }
                    }

                } else {
                    if (!count) count = 1;

                    models = this.models.splice(start, count);
                    this.data.splice(start, count);
                }

                this._triggerChangeEvent();
                this.trigger('remove', models);

                this.root.trigger('change:' + this.eventName + '/remove', this, models);
            },

            clear: function (data) {
                var models = this.models.slice();
                this.models.length = this.data.length = 0;
                this._triggerChangeEvent();

                this.root.trigger('change:' + this.eventName + '/remove', this, models);
            }
        });



    function Repeat(options) {
        $.extend(this, options);

        var self = this;
        var attrs = this.collectionName.split('.');
        var parent = this.parent;

        this.key = attrs[attrs.length - 1];

        while (parent) {
            if (parent.alias == attrs[0]) {
                attrs[0] = parent.collectionName + '^child';
                this.collectionName = attrs.join('.');
                this.isChild = true;
                break;
            }
            parent = parent.parent;
        }

        var replacement = document.createComment(this.collectionName);

        replacement.repeat = this;
        this.replacement = replacement;
        this.el.parentNode.replaceChild(replacement, this.el);
        this.snRepeats = [];

        if (this.filters) {
            this.filter = this.viewModel._compile('{{' + this.filters + '}}', this, function (e, model) {
                var now = Date.now();

                var isUnderRoot = model.under();

                for (var i = 0; i < self.snRepeats.length; i++) {
                    var item = self.snRepeats[i];

                    if (isUnderRoot || model == item.referenceModel || model.under(item.referenceModel) || model.under(item.collection()) || model.contains(item.referenceModel)) {
                        item.update();
                    }
                }
            });
        }

        var eventName = "change:" + this.collectionName.replace(/\./g, '/');

        this.syncModels = [];

        this.viewModel.on(eventName + '/add', function (e, collection, models) {

            self.syncModels = self.syncModels.concat(models);

            for (var i = 0; i < self.snRepeats.length; i++) {
                var snRepeat = self.snRepeats[i];

                if (!self.isChild || collection.parent == snRepeat.referenceModel) {
                    snRepeat.add(models).update();
                }
            }

        }).on(eventName + '/remove', function (e, collection, models) {
            for (var i = 0; i < models.length; i++) {
                var model = models[i];

                for (var j = self.snRepeats.length - 1; j >= 0; j--) {
                    self.snRepeats[j].remove(function (item) {
                        return item.model == model;
                    });
                }
                for (var j = self.syncModels.length - 1; j >= 0; j--) {
                    if (self.syncModels[j] == model)
                        self.syncModels.splice(j, 1);
                }
            }

        });
    }

    Repeat.prototype.append = function (options) {
        var self = this;
        var snRepeat = new SNRepeat(this, options.replacement, options.model);
        var hasAdd = false;

        self.snRepeats.push(snRepeat);

        for (var i = 0; i < self.syncModels.length; i++) {
            var model = self.syncModels[i];
            if (!self.isChild || model.parent.parent == snRepeat.referenceModel) {
                snRepeat.add(model);
                hasAdd = true;
            }
        }

        hasAdd && snRepeat.update();
    }

    function SNRepeat(repeat, replacement, referenceModel) {
        var self = this;

        this.replacement = replacement;
        this.repeat = repeat;
        this.referenceModel = referenceModel;

        replacement.ownSnRepeat = this;

        this.elements = [];
    }

    SNRepeat.prototype = {

        collection: function () {
            return this.referenceModel.model[this.repeat.key];
        },

        _removeEl: function (el) {
            eachElement($(el).remove(), function (node, i) {
                if (node._origin) {
                    var elements = node._origin._elements;
                    for (var i = elements.length - 1; i >= 0; i--) {
                        if (elements[i] == node) {
                            elements.splice(i, 1);
                            break;
                        }
                    }
                }
            });
        },

        update: function () {

            var fragment = document.createDocumentFragment();
            var list = this.elements;
            var repeat = this.repeat;
            var orderBy = repeat.orderBy;
            var root = this.referenceModel.root;
            var parentNode = this.replacement.parentNode;

            if (orderBy) {
                list.sort(function (a, b) {
                    a = a.model.data[orderBy];
                    b = b.model.data[orderBy];
                    return a > b ? 1 : a < b ? -1 : 0;
                });
            }

            var prevEl;
            var changedEls = [];

            this.elIndex = 0;
            this.replacement.snIndexAlias = repeat.indexAlias;

            for (var i = 0, len = list.length; i < len; i++) {
                var item = list[i];
                var el;

                this.replacement.snIndex = this.elIndex;

                if (repeat.filter === undefined || root.call(repeat.filter, Filters, item.model, this.replacement)) {
                    el = item.el ? item.el : (item.el = this.cloneNode(this.el || (this.el = this.cloneNode(repeat.el)), item.model));
                    if (prevEl) {
                        if (prevEl.nextSibling != el) {
                            prevEl.nextSibling ?
                                prevEl.parentNode.insertBefore(el, prevEl.nextSibling) :
                                prevEl.parentNode.appendChild(el);
                        }

                    } else if (!el.parentNode) {
                        fragment.appendChild(el);
                    }
                    prevEl = el;

                    if (repeat.indexAlias && el.snIndex !== this.elIndex) {
                        el.snIndex = this.elIndex;
                        changedEls.push(el);
                    }
                    this.elIndex++;

                } else if (item.el && item.el.parentNode) {
                    item.el.parentNode.removeChild(item.el);
                }
            }

            if (changedEls.length) {
                root._triggerChangeEvent(repeat.collectionName + '/' + repeat.alias + '/' + repeat.indexAlias, changedEls);
            }

            if (fragment.childNodes.length) parentNode.insertBefore(fragment, this.replacement);
        },

        cloneNode: function (el, model, parentNode, repeatNode) {
            var node = el.cloneNode(false);
            var len;

            if (el == this.el) {
                node.snIndex = this.elIndex;
                node.snIndexAlias = this.repeat.indexAlias;
                node.snRepeat = this;
                node.snModel = model;
                node.snReplacement = this.replacement;
                repeatNode = node;

            } else {
                node.snRepeatNode = repeatNode;
            }

            if (parentNode) parentNode.appendChild(node);

            //给repeat占位的CommentElement
            if (el.nodeType == 8 && el.repeat) {
                node.repeat = el.repeat;
                if (model) {
                    el.repeat.append({
                        replacement: node,
                        model: model
                    });
                }

            } else {

                if (el.bindings) {
                    node.bindings = el.bindings;

                    if (model) {
                        (node._origin = el._origin)._elements.push(node);

                        model.root.upperRepeatEl(node, function (elem) {

                            elem.snModel._pushNode(el._origin, node);

                        })._render(node);

                    } else {
                        //SNRepeat实例化时cloneNode执行
                        node._origin = el;
                    }
                }

                if (el.nodeType == 1 && (len = el.childNodes.length)) {
                    for (var i = 0; i < len; i++) {
                        this.cloneNode(el.childNodes[i], model, node, repeatNode);
                    }
                }
            }
            return node;
        },

        each: function (fn, callback, reverse) {
            if (typeof callback !== 'function') reverse = callback, callback = null;
            for (var len = this.elements.length - 1, i = len; i >= 0; i--) {
                var index = reverse ? i : (len - i);
                if (fn.call(this, index, this.elements[index]) === false) {
                    break;
                }
            }
            callback && callback.call(this);
            return this;
        },
        remove: function (start, count) {
            var self = this;
            if (typeof start == 'function') {
                for (var i = this.elements.length - 1; i >= 0; i--) {
                    var item = this.elements[i];
                    if (start(item, i)) {
                        this.elements.splice(i, 1)
                        this._removeEl(item.el);
                    }
                }
            } else {
                this.elements.splice(start, count || 1).forEach(function (item) {
                    self._removeEl(item.el);
                });
            }
            return this;
        },
        add: function (models) {
            var self = this;
            ($.isArray(models) ? models : [models]).forEach(function (model) {
                self.elements.push({
                    model: model
                });
            })
            return this;
        },
        clear: function () {
            return this.each(function (i, item) {
                el.parentNode.removeChild(item.el);
            }, function () {
                this.elements.length = 0;

            }, true);
        }
    }

    var ViewModel = util.createClass(

        $.extend(Object.create(Model.prototype), {

            constructor: function (el, data) {
                if (typeof data === 'undefined' && (el == undefined || $.isPlainObject(el)))
                    data = el, el = this.el;

                this.cid = util.guid();

                this.eventsCache = {};

                this.data = $.extend({}, data);
                this.model = {};
                this.repeats = {};
                this._fns = [];
                this.fns = [];
                this.refs = {};
                this.root = this;
                this._elements = {};

                el && this.bind(el);

                this._initSet = true;
                this.set(this.data);
                this._initSet = false;

                this.onDestroy && this.on('Destroy', this.onDestroy);

                this.initialize.call(this, el, data);
            },

            key: '',

            initialize: util.noop,

            setState: function (cover, key, value) {
                this.$state.set(cover, key, value);
                return this;
            },

            getState: function (key) {
                return this.$state.get(key);
            },

            next: function (callback) {
                return this.one('viewDidUpdate', callback);
            },

            compile: function (code) {
                var index = this._fns.indexOf(code);
                if (index == -1)
                    this._fns.push(code), index = this._fns.length - 1;

                return (this.fns.length + index);
            },

            _compile: function (expression, repeat, listen) {

                var self = this;
                var variables;

                var content = 'try{return \'' +
                    expression
                        .replace(/\\/g, '\\\\').replace(/'/g, '\\\'')
                        .replace(rmatch, function (match, exp) {
                            return '\'+(' + exp.replace(/\\\\/g, '\\').replace(/\\'/g, '\'').replace(rvar, function (match, prefix, name) {
                                if (!name) {
                                    if (match.indexOf('var ') == 0) {
                                        return match.replace(/var\s+([^\=]+)=/, function (match, $0) {
                                            variables = (variables || []).concat($0.split(','));
                                            return $0 + '=';
                                        });
                                    }
                                    return match;
                                }

                                var attrs = name.split('.');
                                var alias = attrs[0];

                                if (alias == "$state") {
                                    self.$state.on('change:' + name.replace('$state.', '').replace(/\./g, '/'), listen);
                                    return prefix + isNull(name);

                                } else if (!alias || Filters[alias] || snGlobal.indexOf(alias) != -1 || (variables && variables.indexOf(alias) != -1) || rvalue.test(name)) {

                                    return prefix + name;
                                }
                                var loopIndex;

                                if (repeat) {
                                    for (var rp = repeat; rp != null; rp = rp.parent) {
                                        if (alias == rp.alias) {
                                            attrs[0] = rp.collectionName + '^child';
                                            break;

                                        } else if (alias == rp.indexAlias) {
                                            loopIndex = rp;
                                            break;
                                        }
                                    }
                                }

                                var eventName = (loopIndex ?
                                    loopIndex.collectionName + '/' + loopIndex.alias + '/' + loopIndex.indexAlias :
                                    attrs.join('/').replace(/\./g, '/'));

                                self.on('change:' + eventName, listen);

                                return prefix + isNull(name);
                            }) + ')+\'';
                        }) +
                    '\';}catch(e){return \'\';}';

                var code = 'function(global,model,el){' +
                    withData(repeat, (variables && variables.length ? 'var ' + variables.join(',') + ';' : '') + content.replace('return \'\'+', 'return ').replace(/\+\'\'/g, '')) +
                    '}';

                return this.compile(code);
            },

            call: function (id, arg0, arg1, arg2, arg3) {
                var fn = this.fns[id];

                switch (arguments.length) {
                    case 1:
                        return fn.call(this);
                    case 2:
                        return fn.call(this, arg0);
                    case 3:
                        return fn.call(this, arg0, arg1);
                    case 4:
                        return fn.call(this, arg0, arg1, arg2);
                    case 5:
                        return fn.call(this, arg0, arg1, arg2, arg3);
                    default:
                        return fn.apply(this, arguments);
                }
            },

            _render: function (el, attribute) {

                var self = this;
                if (el.bindings) {
                    var attrs;
                    if (attribute)
                        (attrs = {})[attribute] = el.bindings[attribute];
                    else
                        attrs = el.bindings;

                    for (var attr in attrs) {
                        var val = self.call(attrs[attr], Filters, self._closestByEl(el), el);

                        switch (attr) {
                            case 'textContent':
                                if (el.textContent !== val + '') {
                                    el.textContent = val;
                                }
                                break;
                            case 'value':
                                if (el.tagName == 'INPUT' || el.tagName == 'SELECT' || el.tagName == 'TEXTAREA') {
                                    if (el.value != val || el.value === '' && val === 0) {
                                        el.value = val;
                                    }
                                } else
                                    el.setAttribute(attr, val);
                                break;
                            case 'html':
                            case 'sn-html':
                                el.innerHTML = val;
                                break;
                            case 'sn-if':
                                if (util.isNo(val)) {
                                    if (el.parentNode) {
                                        if (!el.snReplacement) {
                                            el.snReplacement = document.createComment('if');
                                            el.parentNode.insertBefore(el.snReplacement, el);
                                        }
                                        el.parentNode.removeChild(el);
                                    }

                                } else {
                                    if (!el.parentNode) {
                                        el.snReplacement.parentNode.insertBefore(el, el.snReplacement);
                                    }
                                }
                                break;
                            case 'display':
                            case 'sn-display':
                                el.style.display = util.isNo(val) ? 'none' : val == 'block' || val == 'inline' || val == 'inline-block' ? val : '';
                                break;
                            case 'sn-style':
                            case 'style':
                                el.style.cssText += val;
                                break;
                            case 'checked':
                            case 'selected':
                                (el[attr] = !!val) ? el.setAttribute(attr, attr) : el.removeAttribute(attr);
                                break;
                            case 'src':
                            case 'sn-src':
                                var $el = $(el).one('load error', function () {
                                    $el.animate({
                                        opacity: 1
                                    }, 200);
                                }).css({
                                    opacity: 0

                                }).attr({
                                    src: val
                                });
                                break;
                            default:
                                el.setAttribute(attr, val);
                                break;
                        }
                    }
                }
            },

            _renderEls: function (elements, attr) {
                for (var i = 0, n = elements && elements.length; i < n; i++) {
                    this._render(elements[i], attr);
                }

            },
            _bindAttr: function (node, attr, expression, repeat) {
                var self = this;
                var elements;

                if (!rmatch.test(expression)) return;

                (node.bindings || (node._elements = [], node.bindings = {}))[attr] = self._compile(expression, repeat, function (e, model) {
                    if (!repeat) {
                        self._render(node, attr);

                    } else if (model instanceof Model) {
                        elements = (model == self || model.under()) ? node._elements : model._elements[node.snElementId];

                        self._renderEls(elements);

                    } else if (model instanceof Collection) {
                        for (var i = 0, n = model.models.length; i < n; i++) {

                            elements = model.models[i]._elements[node.snElementId];

                            self._renderEls(elements);
                        }
                    } else if ($.isArray(model)) {
                        for (var el, i = 0, n = model.length; i < n; i++) {
                            el = model[i];

                            elements = el.snModel._elements[node.snElementId];

                            self._renderEls(elements);
                        }
                    }
                });
            },

            _closestByEl: function (el) {
                return this.upperRepeatEl(el, function (el) {
                    return el.snModel;
                });
            },

            _getByEl: function (el, name) {
                var self = this;
                var attrs = name.split('.');
                var alias = attrs[0];

                if (alias == 'this') {
                    return self;
                } else if (alias == "$state")
                    return self.$state;

                return this.upperRepeatEl(el, function (el) {
                    if (el.snRepeat.repeat.alias == alias)
                        return el.snModel;
                });
            },
            _getVal: function (model, name) {
                var model = model == this || model instanceof Model ? model : this._getByEl(model, name);

                return model.get(model == this ? name : name.replace(/^[^\.]+\./, ''));
            },

            _setByEl: function (el, name, value) {
                var model = this._getByEl(el, name);

                model.set(model == this || model == self.$state ? name : name.replace(/^[^\.]+\./, ''), value);
            },

            _triggerChangeEvent: function (eventName, model) {
                var self = this;

                !model && (model = this);

                eventName = 'change' + (eventName ? ":" + eventName : '').replace(/\./g, '/');

                var eventsCache = self.eventsCache[eventName] || (self.eventsCache[eventName] = []);

                (eventsCache.indexOf(model) == -1) && eventsCache.push(model);

                if (!self.changeEventsTimer) {
                    self.changeEventsTimer = setTimeout(function () {
                        var now = Date.now();
                        var roots = [];

                        for (var key in self.eventsCache) {

                            eventsCache = self.eventsCache[key];

                            for (var i = 0, n = eventsCache.length; i < n; i++)
                                self.trigger(key, eventsCache[i]);
                        }

                        self.eventsCache = {};
                        self.changeEventsTimer = null;
                        self.trigger("viewDidUpdate");

                    }, 0);
                }

                return this;
            },

            upperRepeatEl: function (el, fn, ret) {

                while (el) {
                    if (el.snRepeatNode)
                        el = el.snRepeatNode;

                    if (el.snModel && el.snRepeat) {
                        if ((val = fn(el)) !== undefined) return val;

                        el = el.snReplacement;

                    } else
                        break;
                }

                return ret === undefined ? this : ret;
            },

            bind: function (el) {
                var self = this;
                var elements = [];
                var snModelName = 'sn-' + self.cid + 'model';

                var $el = $(el).on('input change blur', '[' + snModelName + ']', function (e) {
                    var target = e.currentTarget;
                    var name = target.getAttribute(snModelName);

                    self._setByEl(target, name, target.value);
                });

                self.$el = !self.$el ? $el : self.$el.add($el);

                eachElement($el, function (child, i, extendRepeat) {
                    if (child.snViewModel) return false;

                    if (child.nodeType == 1) {
                        var repeat = child.getAttribute('sn-repeat');
                        if (repeat != null) {
                            var match = repeat.match(rrepeat);
                            var collectionName = match[3];
                            var viewModel = collectionName.indexOf('$state') == 0 ? self.$state : self;
                            repeat = new Repeat({
                                root: self,
                                viewModel: viewModel,
                                parent: extendRepeat,
                                alias: match[1],
                                indexAlias: match[2],
                                collectionName: collectionName,
                                filters: match[4],
                                orderBy: match[5],
                                el: child
                            });
                            (viewModel.repeats[repeat.collectionName] || (viewModel.repeats[repeat.collectionName] = [])).push(repeat);

                            if (!extendRepeat) {
                                repeat.append({
                                    replacement: repeat.replacement,
                                    model: self
                                });
                            }

                        } else {
                            repeat = extendRepeat;
                        }

                        for (var j = child.attributes.length - 1; j >= 0; j--) {
                            var attr = child.attributes[j].name;
                            var val = child.attributes[j].value;

                            if (val) {
                                if (attr == 'sn-error') {
                                    attr = 'onerror'
                                } else if (attr == 'sn-src') {
                                    attr = 'src'
                                }
                                if (attr == "ref") {
                                    self.refs[val] = child;

                                } else if (attr == 'sn-display' || attr == 'sn-html' || attr == 'sn-if' || attr == 'sn-style' || attr.indexOf('sn-') != 0) {
                                    if (attr.indexOf('sn-') == 0 && val.indexOf("{{") == -1 && val.indexOf("}}") == -1) {
                                        val = '{{' + val + '}}';
                                    }
                                    self._bindAttr(child, attr, val, repeat);

                                } else if (attr == 'sn-model') {
                                    child.removeAttribute(attr);
                                    child.setAttribute("sn-" + self.cid + "model", val);

                                } else {
                                    var origAttr = attr;

                                    attr = attr.replace(/^sn-/, '');

                                    var evt = snEvents[attr];

                                    if (evt) {
                                        child.removeAttribute(origAttr);

                                        attr = "sn-" + self.cid + "-" + evt;

                                        if (rset.test(val) || rthis.test(val)) {
                                            var content = val.replace(rthis, function (match, $1, $2) {
                                                return $1 + "e" + ($2 ? ',' : '') + $2 + ")";

                                            }).replace(rset, 'this._setByEl(e.currentTarget,"$1",$2)');

                                            var code = 'function(e,model,global){var el=e.currentTarget;' + withData(repeat, content) + "}";
                                            child.setAttribute(attr, self.compile(code));

                                        } else {
                                            child.setAttribute(attr, val);
                                        }
                                    }
                                }
                            }
                        }
                        if (!repeat && child.bindings) {
                            elements.push(child);
                        }
                        return repeat;

                    } else if (child.nodeType == 3) {
                        self._bindAttr(child, 'textContent', child.textContent, extendRepeat);
                        if (!extendRepeat && child.bindings) {
                            elements.push(child);
                        }
                    }
                });

                $el.each(function () {
                    this.snViewModel = self.cid;
                    this.model = self;
                })

                //事件处理
                var _handleEvent = function (e) {
                    if (e.type == $.fx.transitionEnd && e.target != e.currentTarget) {
                        return;
                    }

                    var target = e.currentTarget;
                    var eventCode = target.getAttribute('sn-' + self.cid + '-' + e.type);
                    var fn;
                    var ctx;

                    if (eventCode == 'false') {
                        return false;

                    } else if (/^\d+$/.test(eventCode)) {
                        var model = self._closestByEl(target);
                        (model.root === self) && self.call(eventCode, e, model, Filters);

                    } else {
                        var args = [e];
                        var argName;
                        var argNames = eventCode.split(':');

                        for (var i = 0; i < argNames.length; i++) {
                            var attr = argNames[i];
                            if (i == 0) {
                                ctx = self._getByEl(target, attr);
                                fn = self._getVal(ctx, attr);

                                e.model = self._closestByEl(target, attr);

                            } else {
                                args.push(self._getVal(target, attr));
                            }
                        }

                        fn.apply(ctx, args);
                    }
                };

                for (var key in snEvents) {
                    var eventName = snEvents[key];
                    var attr = '[sn-' + self.cid + '-' + eventName + ']';
                    $el.on(eventName, attr, _handleEvent);
                }

                this.fns = this.fns.concat(window.eval('[' + this._fns.join(',') + ']'));
                this._fns.length = 0;

                for (var i = 0, len = elements.length; i < len; i++) {
                    self._render(elements[i]);
                }

                return this;
            }

        }, util.pick(Component.prototype, ['$', 'undelegateEvents', 'listenTo', 'listen', 'destroy']))
    );



    exports.State = ViewModel.prototype.$state = new ViewModel();

    exports.ViewModel = ViewModel;
    exports.Filters = Filters;
});


/*
    this.model = new model.ViewModel($('<div><div sn-repeat="item in data"><span>{{item.name}}</span><i sn-repeat="p in children">{{p.name}}</i></div></div>'), {
        data: [{
            name: '1234'
        }],
        children: [{
            name: 'aaa'
        }]
    });
    
    this.model = new model.ViewModel($('<div><div sn-repeat="item in data"><span>{{item.name}}</span><i sn-repeat="p in item.children">{{p.name}}</i></div></div>'), {
        data: [{
            name: '1234',
            children: [{
                name: 'aaa'
            }]
        }]
    });
    this.model.$el.appendTo($('body'));
    
    
    var data = {
        data: []
    }
    
    var data1={
        name:'state',
        data:[]
    }

    for (var i = 0; i < 10; i++) {
        data.data.push({
            id: i,
            name: 'adsf' + i,
            src: "http://" + i
        });
        
        data1.data.push({
            id: i,
            name: 'adsf' + i,
            src: "http://" + i
        });
    }

    this.model = new model.ViewModel($(<div>{{$state.name}}</div>), data);
        
    this.model.setState(data1);

    this.model.$el.appendTo($main.html(''));
    return;
*/