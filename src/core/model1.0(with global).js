/**
 * 作者: sunlu
 * 用途: ViewModel
 */

var $ = require('$');
var Base = require('./base');
var util = require('util');
var Event = require('./event');

util.style('.sn-display { opacity: 1; -webkit-transition: opacity 300ms ease-out 0ms; transition: opacity 300ms ease-out 0ms; }\
.sn-display-show { opacity: 1; }\
.sn-display-hide { opacity: 0; }');

var toString = Object.prototype.toString;
var LINKEDCHANGE = 'linkedchange';
var DATACHANGED_EVENT = "datachanged";

var TRANSITION_END = $.fx.transitionEnd;
var isArray = Array.isArray;
var extend = $.extend;


var EVENTS = {
    tap: 'tap',
    'long-tap': 'longTap',
    'transition-end': TRANSITION_END,
    touchstart: 'touchstart',
    touchend: 'touchend',
    touchmove: 'touchmove',
    click: 'click',
    load: 'load',
    error: 'error',
    change: 'change',
    input: 'input',
    focus: 'focus',
    blur: 'blur'
};

var GLOBAL_VARIABLES = {
    'new': true,
    'this': true,
    '$': true,
    "sl": true,
    'util': true,
    "JSON": true,
    'Math': true,
    'Date': true,
    'encodeURIComponent': true,
    'decodeURIComponent': true,
    'window': true,
    'document': true
};

var rvalue = /^((-)?\d+(\.\d+)?|true|false|undefined|null|'(?:\\'|[^'])*')$/;
var rrepeat = /([\w$]+)(?:\s*,(\s*[\w$]+)){0,1}\s+in\s+([\w$]+(?:\.[\w$\(,\)]+){0,})(?:\s*\|\s*filter\s*\:\s*(.+?)){0,1}(?:\s*\|\s*orderBy\:(.+)){0,1}(\s|$)/;
var rmatch = /\{\s*(.+?)\s*\}(?!\s*\})/g;
var rset = /([\w$]+(?:\.[\w$]+)*)\s*=\s*((?:\((?:'(?:\\'|[^'])*'|[^\)])+\)|'(?:\\'|[^'])*'|[\w$][!=]==?|[^;=])+?)(?=;|,|\)|$)/g;
var rfunc = /\b((?:this\.){0,1}[\.\w$]+\()((?:'(?:\\'|[^'])*'|\((?:\((?:\((?:\(.*?\)|.)*?\)|.)*?\)|[^\)])*\)|[^\)])*)\)/g;
var rSnAttr = /^sn-/;

// console.log('t$y_p0e=type_$==1?2:1;alert()'.match(rset))
// console.log('!=><+-|?([]*)'.match(/[!=><?\s:(),%&|+*\-\/\[\]]+/));
// console.log('!=:><+-|?([]*)'.match(/:/))

//var rfunc = /\b((?:this\.){0,1}[\.\w]+\()((?:'(?:\\'|[^'])*'|[^\)])*)\)/g;
//   /(?:\((?:\(.*?\)|.)*?\)|.)/

var Filters = {
    contains: function (source, keywords) {

        return !keywords || source.indexOf(keywords) != -1;
    },
    like: function (source, keywords) {
        source = source.toLowerCase();
        keywords = keywords.toLowerCase();
        return !keywords || source.indexOf(keywords) != -1 || keywords.indexOf(source) != -1;
    },
    util: util
};

var FILTERS_VARS = (function () {
    var res = '';
    for (var key in Filters) {
        res += 'var ' + key + '=$data.' + key + ';';
    }
    return res;
})();

function isThenable(thenable) {
    return thenable && typeof thenable.then === 'function';
}

function testRegExp(regExp, val) {
    return regExp.lastIndex != 0 && (regExp.lastIndex = 0) || regExp.test(val);
}

function valueExpression(str, variables) {
    var arr = str.split('.');
    var alias = arr[0];
    var result = [];
    var code = '';
    var gb = '$data';

    if (!alias || GLOBAL_VARIABLES[alias] || rvalue.test(str) || (variables && variables.indexOf(alias) != -1) || alias in Filters) {
        return str;

    } else if (alias == 'delegate') {
        return 'this.' + str;
    }

    str = gb + '.' + str;

    for (var i = 0; i < arr.length; i++) {
        result[i] = (i == 0 ? gb : result[i - 1]) + '.' + arr[i];
    }
    for (var i = 0; i < result.length; i++) {
        code += (i ? '&&' : '') + result[i] + '!==null&&' + result[i] + '!==undefined';
    }
    //typeof ' + str + '==="function"?' + str + '():
    return '((' + code + ')?' + str + ':"")';
}


function insertElementAfter(cursorElem, elem) {
    if (cursorElem.nextSibling != elem) {
        cursorElem.nextSibling ?
            cursorElem.parentNode.insertBefore(elem, cursorElem.nextSibling) :
            cursorElem.parentNode.appendChild(elem);
    }
}

function closestElement(el, fn) {
    for (var parentNode = el.parentNode; parentNode; parentNode = parentNode.parentNode) {
        var res = fn(parentNode, el);
        if (res === true) {
            return parentNode;
        } else if (res === false) {
            break;
        }
    }
    return null;
}


function cloneElement(node, each) {
    var stack = [];
    var parentCloneStack = [];
    var nodeClone = node.cloneNode(false);
    var parentNode = nodeClone;
    var nextSibling;

    each(node, nodeClone);

    node = node.firstChild;

    while (node) {

        clone = node.cloneNode(false);
        parentNode.appendChild(clone);
        nextSibling = node.nextSibling;

        each(node, clone);

        if (node.firstChild) {
            if (nextSibling) {
                stack.push(nextSibling);
                parentCloneStack.push(parentNode);
            }
            parentNode = clone;
            node = node.firstChild;

        } else if (nextSibling) {
            node = nextSibling;
        } else {
            parentNode = parentCloneStack.pop();
            node = stack.pop();
        }
    }

    return nodeClone;
}


function eachElement(el, fn) {
    if (!el) return;

    if (isArray(el) || el instanceof $.fn.constructor) {
        for (var i = 0, len = el.length; i < len; i++) {
            eachElement(el[i], fn);
        }
        return;
    }
    var stack = [];
    var firstLoop = true;

    while (el) {
        var flag = fn(el);
        var nextSibling;

        if (flag && flag.nodeType) {
            nextSibling = flag;

        } else if (flag && flag.nextSibling) {
            nextSibling = flag.nextSibling;
            flag = flag.isSkipChildNodes === true ? false : true;

        } else if (!firstLoop) {
            nextSibling = el.nextSibling;
        }
        if (firstLoop) firstLoop = false;

        if (flag !== false && el.firstChild) {
            if (nextSibling) {
                stack.push(nextSibling);
            }
            el = el.firstChild;

        } else if (nextSibling) {
            el = nextSibling;
        } else {
            el = stack.pop();
        }
    }
}

function setRef(viewModel, el) {
    var refName = el.getAttribute('ref');

    if (refName && !el.snRequire) {
        var ref = el.snRequireInstance || el;
        var refs = viewModel.refs[refName];

        if (!refs) {

            viewModel.refs[refName] = el.snRepeatSource || closestElement(el, function (parentNode) {
                return parentNode.snRepeatSource ? true : parentNode.snViewModel ? false : null;

            }) ? [ref] : ref;

        } else if (refs.nodeType) {
            viewModel.refs[refName] = [refs, ref];

        } else {
            refs.push(ref);
        }
    }
}

function formatData(viewModel, element, snData) {
    var data = Object.assign({
        global: viewModel.global.attributes,
        srcElement: element

    }, Filters, viewModel.attributes);

    if (snData) {
        for (var key in snData) {
            var model = snData[key];

            if (model instanceof Model || model instanceof Collection) {
                data[key] = model.attributes;

            } else {
                data[key] = model;
            }
        }
    }

    return data
}

function executeFunction(viewModel, functionId, data) {
    return viewModel.fns[functionId].call(viewModel, data);
}


function checkOwnNode(viewModel, node) {
    if (typeof node == 'string') {
        node = viewModel.$el.find(node);

        if (!node.length)
            throw new Error('is not own node');

    } else {

        viewModel.$el.each(function () {
            if (!$.contains(this, node))
                throw new Error('is not own node');
        });
    }
    return node;
}

function updateRequiredView(viewModel, el) {
    var id = el.getAttribute('sn-data');
    var data = !id ? null : executeFunction(viewModel, id, formatData(viewModel, el.snData, el));

    if (el.snRequireInstance) {
        el.snRequireInstance.set(data);

    } else {
        var children = [];
        var node;
        var instance;

        for (var i = 0, j = el.childNodes.length - 1; i < j; i++) {
            node = el.childNodes[i];

            if (node.nodeType !== 3) {
                children.push(node);
                node.snViewModel = viewModel;
                viewModel.$el.push(node);
            }
        }

        instance = el.snRequireInstance = new el.snRequire(data, children);

        instance.$el.appendTo(el);

        delete el.snRequire;
    }

    setRef(viewModel, el);
}

function cloneRepeatElement(source, snData) {
    return cloneElement(source, function (node, clone) {

        clone.snData = snData;
        clone.snIsGlobal = node.snIsGlobal;

        if (node.snRepeatSource) {
            clone.snRepeatSource = node.snRepeatSource;
        }
        if (node.snBinding) {
            clone.snBinding = node.snBinding;
        }
        if (node.snIfOrigin) {

            clone.snIfOrigin = cloneRepeatElement(node.snIfOrigin, snData);
            clone.snIfType = clone.snIfOrigin.snIfType = node.snIfType;
            clone.snIfOrigin.snIf = clone;
        }
    });
}

function updateRepeatElement(viewModel, el) {

    var repeatSource = el.snRepeatSource;
    var collection = el.snCollection;
    var model;
    var offsetParent = repeatSource.offsetParent;
    var orderBy = repeatSource.orderBy;

    var parentSnData = {};

    if (repeatSource.parent) {
        closestElement(el, function (parentNode) {
            if (parentNode.snRepeatSource == repeatSource.parent && parentNode.snData) {
                Object.assign(parentSnData, parentNode.snData);
                return true;
            }
        });
    }

    var collectionData;

    if (repeatSource.isFn) {

        collectionData = executeFunction(viewModel, repeatSource.fid, formatData(viewModel, parentSnData, el));
    }

    if (!collection) {

        if (repeatSource.isGlobal) {
            model = viewModel.global;

        } else if (!offsetParent) {
            model = viewModel;

        } else {
            closestElement(el, function (parentNode) {
                if (parentNode.snRepeatSource == offsetParent) {
                    model = parentNode.snModel;
                    return true;
                }
            })
        }

        if (repeatSource.isFn) {
            collection = new Collection(viewModel, repeatSource.collectionKey, collectionData);

        } else {
            collection = model && findModelByKey(model, repeatSource.collectionKey);
        }

        if (!collection) return;

        el.snCollection = collection;

    } else if (repeatSource.isFn) {
        collection.set(collectionData);
    }

    var elements = el.snElements || (el.snElements = []);
    var list = [];
    var cursorElem = el;
    var elementsLength = elements.length;
    var elemContain = {};

    collection.each(function (model) {
        var elem;
        var elemIndex = -1;
        var snData;
        var isInData = true;
        var ifElement;

        for (var j = 0; j < elementsLength; j++) {

            if (elements[j].snModel == model) {
                elemContain[j] = true;
                elem = elements[j];
                elemIndex = j;
                break;
            }
        }

        if (!elem) {
            snData = Object.assign({}, parentSnData);
            snData[repeatSource.alias] = model;

        } else {
            snData = elem.snData;
        }

        if (repeatSource.filter) {
            isInData = repeatSource.filter.call(viewModel, formatData(viewModel, elem, snData));
        }

        if (isInData) {

            if (!elem) {
                elem = cloneRepeatElement(repeatSource.source, snData);

                elem.snRepeatSource = repeatSource;
                elem.snModel = model;

                elements.push(elem);
            }

            list.push({
                el: elem,
                model: model
            });

        } else if (elemIndex != -1) {
            elemContain[elemIndex] = false;
        }

    });

    if (orderBy) {

        if (typeof orderBy == 'string') {
            // 排序方法
            list.sort(viewModel[orderBy]);

        } else {
            // orderBy=['a',true,someFunctionId,false]
            orderBy = orderBy.map(function (item) {
                if (typeof item === 'number') {

                    return executeFunction(viewModel, item, formatData(viewModel, parentSnData, el));
                }
                return item;
            });

            list.sort(function (am, bm) {
                var ret = 0;
                var isDesc;
                var sort;
                var a, b;

                for (var i = 0; i < orderBy.length; i += 2) {
                    sort = orderBy[i];
                    isDesc = orderBy[i + 1] == false;

                    a = am.model.attributes[sort];
                    b = bm.model.attributes[sort];

                    ret = isDesc ? (a > b ? -1 : a < b ? 1 : 0) : (a > b ? 1 : a < b ? -1 : 0);

                    if (ret != 0) return ret;
                }

                return ret;
            });
        }
    }

    list.forEach(function (item, index) {
        var elem = item.el;

        insertElementAfter(cursorElem, elem);
        cursorElem = elem;

        repeatSource.loopIndexAlias && (elem.snData[repeatSource.loopIndexAlias] = index);
    });

    // 移除过滤掉的element
    for (var i = 0; i < elementsLength; i++) {
        if (!elemContain[i]) {
            var elem = elements[i];
            elem.parentNode && elem.parentNode.removeChild(elem);
        }
    }

    return cursorElem;
}

function findModelByKey(model, key) {
    if (model.key == key) return model;

    var models = model._model;
    var model;

    while (1) {
        var flag = false;

        for (var modelKey in models) {
            model = models[modelKey];

            if (model instanceof Model || model instanceof Collection) {

                if (model.key == key) {
                    return model;

                } else {
                    var linkedParents = model._linkedParents;
                    if (linkedParents && linkedParents.length) {

                        for (var i = 0, len = linkedParents.length; i < len; i++) {
                            var childModelKey = linkedParents[i].childModelKey;
                            if (key == childModelKey) {
                                return model;

                            } else if (key.indexOf(childModelKey + '.') == 0) {
                                flag = true;
                                key = key.substr(childModelKey.length + 1);
                                break;
                            }
                        }

                    } else if (key.indexOf(model.key + '.') == 0) {
                        flag = true;
                    }
                }

                if (flag && model._model) {
                    models = model._model;
                    break;
                }
            }
        }

        if (!flag) break;
    }

    return null;
}

function updateNode(viewModel, el) {
    if (el.nodeType == 8 && el.snRepeatSource) {
        updateRepeatElement(viewModel, el);

    } else if (el.snIfOrigin) {
        return {
            isSkipChildNodes: true,
            nextSibling: el.snIfOrigin
        };

    } else {
        el.snBinding && updateNodeAttributes(viewModel, el);

        if (el.nodeType == 1) {

            if (el.snIf) {
                if (!el.parentNode) {
                    return {
                        isSkipChildNodes: true,
                        nextSibling: el.snIf.nextSibling
                    };

                } else {
                    if (el.snRequireInstance || el.snRequire) updateRequiredView(viewModel, el);
                    else setRef(viewModel, el);

                    var nextElement = el.nextSibling;
                    var currentElement = el;

                    while (nextElement) {

                        if (nextElement.nodeType === 3) {
                            nextElement = nextElement.nextSibling;
                            continue;
                        }

                        if (!nextElement.snIf && !nextElement.snIfOrigin || nextElement.snIfType == 'sn-if') {
                            break;
                        }

                        switch (nextElement.snIfType) {
                            case 'sn-else':
                            case 'sn-else-if':

                                if (nextElement.snIf) {
                                    nextElement.parentNode.removeChild(nextElement);
                                    currentElement = nextElement.snIf;

                                } else {
                                    currentElement = nextElement;
                                }
                                break;
                            default:
                                throw new Error(nextElement.snIfType, ':snIfType not available');
                        }
                        nextElement = currentElement.nextSibling;
                    }

                    return currentElement.nextSibling;
                }

            } else if (el.snRequireInstance || el.snRequire) {
                updateRequiredView(viewModel, el);

            } else {
                setRef(viewModel, el);
            }
        }

    }
}


function updateNodeAttributes(viewModel, el, attribute) {
    var attrsBinding;
    var data = formatData(viewModel, el, el.snData);

    if (attribute)
        (attrsBinding = {})[attribute] = el.snBinding[attribute];
    else
        attrsBinding = el.snBinding;

    var attrs = el.snAttrs || (el.snAttrs = {});

    var keys = [];

    for (var key in attrsBinding) {
        switch (key) {
            case "sn-else":
                if (!el.parentNode) {
                    el.snIf.nextSibling ?
                        el.snIf.parentNode.insertBefore(el, el.snIf.nextSibling) :
                        el.snIf.parentNode.appendChild(el);
                }
                break;
            case "sn-if":
            case "sn-else-if":
                var val = executeFunction(viewModel, attrsBinding[key], data);

                if (util.isNo(val)) {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                    return;

                } else {
                    if (!el.parentNode) {
                        el.snIf.nextSibling ?
                            el.snIf.parentNode.insertBefore(el, el.snIf.nextSibling) :
                            el.snIf.parentNode.appendChild(el);
                    }
                }
                break;
            default:
                keys.push(key);
                break;
        }
    }

    for (var i = 0, n = keys.length; i < n; i++) {

        var attr = keys[i];
        var val = executeFunction(viewModel, attrsBinding[attr], data);

        if (attrs[attr] === val) continue;
        attrs[attr] = val;

        switch (attr) {
            case 'textContent':
                if (typeof val == 'object') {
                    if (val.nodeType) {
                        if (el.nextSibling != val) {
                            $(val).insertAfter(el);
                        }

                    } else if (isArray(val)) {
                        var firstChild = val[0];
                        if (firstChild && el.nextSibling != firstChild)
                            val.forEach(function (item) {
                                $(item).insertAfter(el);
                            });
                    }

                } else
                    el.textContent = val;
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

            case 'sn-visible':
                el.style.display = util.isNo(val) ? 'none' : val == 'block' || val == 'inline' || val == 'inline-block' ? val : '';
                break;
            case 'display':
                el.style.display = util.isNo(val) ? 'none' : val == 'block' || val == 'inline' || val == 'inline-block' ? val : '';
                break;
            case 'sn-display':
                var $el = $(el);
                var isInitDisplay = true;
                if (!$el.hasClass('sn-display')) {
                    isInitDisplay = false;
                    $el.addClass('sn-display')[0].clientHeight;
                }
                var display = util.isNo(val) ? 'none' : val == 'block' || val == 'inline' || val == 'inline-block' ? val : '';

                if (display == 'none') {
                    if (!$el.hasClass('sn-display-hide')) {

                        var onHide = function () {
                            if ($el.hasClass('sn-display-hide'))
                                $el.hide();
                        }
                        $el.addClass('sn-display-hide')
                            .one(TRANSITION_END, onHide);
                        setTimeout(onHide, 300);
                    }

                } else if (!isInitDisplay || $el.hasClass('sn-display-hide')) {
                    $el.css({
                        display: display
                    });
                    el.clientHeight;

                    $el.removeClass('sn-display-hide');
                }
                break;
            case 'sn-css':
                el.style.cssText += val;
                break;
            case 'sn-style':
            case 'style':
                el.style.cssText = val;
                break;
            case 'checked':
            case 'selected':
            case 'disabled':
                (el[attr] = !!val) ? el.setAttribute(attr, attr) : el.removeAttribute(attr);
                break;
            case 'src':
                el.src = val;
                break;
            case 'sn-src':
                if (el.getAttribute('sn-' + viewModel.cid + 'load') || el.getAttribute('sn-' + viewModel.cid + 'error'))
                    $(el).one('load error', viewModel._handleSnEvent);

                if (el.src) {
                    el.src = val;

                } else {
                    $(el).one('load error', function (e) {
                        $(this).animate({
                            opacity: 1
                        }, 200);

                    }).css({
                        opacity: 0

                    }).attr({
                        src: val
                    });
                }
                break;

            case 'classname':
            case 'class':
                el.className = val;
                break;
            default:
                val === null ? el.removeAttribute(attr) : el.setAttribute(attr, val);
                break;
        }
    }
}


function bindNodeAttributes(viewModel, el) {

    if (el.nodeType == 3) {
        var fid = createFunction(viewModel, el.textContent);

        if (fid) {
            el.snBinding = {
                textContent: fid.id
            };
            el.snIsGlobal = fid.isGlobal;
            el.textContent = '';
        }
        return;
    }

    for (var j = el.attributes.length - 1; j >= 0; j--) {
        var attr = el.attributes[j].name;
        var val = el.attributes[j].value;

        if (val || attr == 'sn-else') {

            switch (attr) {
                case 'sn-if':
                case 'sn-else':
                case 'sn-else-if':
                    var snIf = document.createComment(attr);
                    snIf.snIfOrigin = el;
                    el.snIf = snIf;
                    el.snIfType = snIf.snIfType = attr;
                    el.parentNode.insertBefore(snIf, el);
                    el.parentNode.removeChild(el);

                    if (attr == 'sn-else') {
                        (el.snBinding || (el.snBinding = {}))[attr] = attr;
                        break;
                    }

                case 'sn-src':
                case 'sn-html':
                case 'sn-display':
                case 'sn-style':
                case 'sn-css':
                case "sn-data":
                    if (val.indexOf("{") == -1 || val.indexOf("}") == -1) {
                        val = '{' + val + '}';
                    }
                case attr.replace(rSnAttr):
                    var fid = createFunction(viewModel, val);

                    if (attr == "sn-data" && fid) {
                        el.setAttribute(attr, fid.id);

                    } else if (fid) {
                        (el.snBinding || (el.snBinding = {}))[attr] = fid.id;
                        el.snIsGlobal = fid.isGlobal;
                        el.removeAttribute(attr);

                    } else if (attr == "ref" && !el.getAttribute('sn-require')) {
                        viewModel.refs[val] = el;
                    }
                    break;

                case 'sn-model':
                    el.removeAttribute(attr);
                    el.setAttribute(viewModel.snModelKey, val);
                    break;
                case 'sn-require':
                    el.snRequire = require(val) || val;
                    break;
                default:
                    //处理事件绑定
                    var origAttr = attr;

                    attr = attr.replace(rSnAttr, '');

                    var evt = EVENTS[attr];

                    if (evt) {
                        el.removeAttribute(origAttr);

                        attr = "sn-" + viewModel.cid + evt;

                        var a = /\d+$/g;

                        if (testRegExp(rset, val) || testRegExp(rfunc, val)) {

                            var content = val.replace(rfunc, function (match, $1, $2) {

                                if (/^(Math\.|encodeURIComponent\(|parseInt\()/.test($1)) {
                                    return match;
                                }

                                return $1 + $2 + ($2 ? ',e)' : 'e)');
                            })
                                // .replace(rset, function (match, $1, $2) {
                                //     console.log(match, $1, $2);
                                //     return match;

                                // })
                                .replace(rset, 'this.dataOfElement(e.currentTarget,"$1",$2)');

                            var fid = createFunction(viewModel, '{' + content + '}');
                            if (fid) {
                                el.setAttribute(attr, fid.id);
                            }

                        } else {
                            el.setAttribute(attr, val);
                        }
                    }
                    break;
            }
        }
    }
}

function bindNewElement(viewModel, newNode) {
    newNode = $(newNode);

    newNode.each(function () {
        if (this.snViewModel)
            throw new Error("can not insert or append binded node!");
    });

    bindElement(viewModel, newNode);

    viewModel.render();

    return newNode;
}


function bindElement(viewModel, $el) {

    viewModel._codes = [];

    eachElement($el, function (node) {

        if (node.snViewModel) return false;

        if (node.nodeType != 8)
            bindNodeAttributes(viewModel, node);

        var parentRepeatSource;
        for (var parentNode = (node.snIf || node).parentNode; parentNode && !parentNode.snViewModel; parentNode = (parentNode.snIf || parentNode).parentNode) {

            if (parentNode.snRepeatSource) {
                parentRepeatSource = parentNode.snRepeatSource;
                break;
            }
        }

        if (RepeatSource.isRepeatNode(node)) {
            if (node.snIf) throw new Error('can not use sn-if and sn-repeat at the same time!!please use filter instead!!');

            var nextSibling = node.nextSibling;
            var repeatSource = new RepeatSource(viewModel, node, parentRepeatSource);

            node.snRepeatSource = repeatSource;

            return nextSibling;

        } else if (node.snIf) {
            return node.snIf.nextSibling;
        }
    });

    for (var key in EVENTS) {
        var eventName = EVENTS[key];
        var attr = '[sn-' + viewModel.cid + eventName + ']';

        $el.on(eventName, attr, viewModel._handleSnEvent)
            .filter(attr)
            .on(eventName, viewModel._handleSnEvent);
    }

    var fns = new Function('return [' + viewModel._codes.join(',') + ']')();

    fns.forEach(function (fn) {
        viewModel.fns.push(fn);
    });
}


function linkModels(model, value, key) {
    var root = model.root;

    var link = {
        childModelKey: key,
        childModel: value,
        childRoot: value.root,
        model: model,
        cb: function () {

            root.render();
        }
    };

    value.root.on(LINKEDCHANGE + ":" + value.cid, link.cb);

    (value._linkedParents || (value._linkedParents = [])).push(link);
    (root._linkedModels || (root._linkedModels = [])).push(link);
}

function unlinkModels(model, value) {
    var root = model.root;
    var link;
    var linkedModels = root._linkedModels;
    var linkedParents = value._linkedParents;
    if (linkedModels && linkedParents) {

        for (var i = linkedModels.length - 1; i >= 0; i--) {
            link = linkedModels[i];
            if (link.model == model && link.childModel == value) {
                linkedModels.splice(i, 1);
                linkedParents.splice(linkedParents.indexOf(link));
                value.root.off(LINKEDCHANGE + ":" + value.cid, link.cb);
                break;
            }
        }
    }
}

function createFunction(viewModel, expression) {
    if (!expression) return null;

    expression = expression.replace(/^\s+|\s+$/g, '');

    if (!expression) return null;

    var expObj = viewModel._expressions[expression];

    if (expObj) {
        return expObj;
    }

    var res = genFunction(expression);

    if (!res) return null;

    viewModel._codes.push('function($data){' + res.code + '}');

    var id = viewModel._expressions.length++;

    var ret = {
        id: id,
        isGlobal: res.isGlobal
    }

    viewModel._expressions[expression] = ret;

    return ret;
}

var EXPRESSION_RE = /(?:\{|,)\s*[\w$]+\s*:|'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/[img]*(?=[\)|\.|,])|\/\/.*|\bvar\s+('(?:\\'|[^'])*'|[^;]+);|(^|[!=><?\s:(),%&|+*\-\/\[\]]+)([$a-zA-Z_][\w$]*(?:\.[\w$]+)*(?![\w$]*\())/g;

var VARS_RE = /([\w$]+)\s*(?:=(?:'(?:\\'|[^'])*'|[^;,]+))?/g;

// 测试代码
// console.log('{var a=2,c=2;b=4,t$y_p0e=type_$==1?2:1}'.match(EXPRESSION_RE))
// var match = 'a=34,c';
// var m;
// while (m = VARS_RE.exec(match)) {
//     console.log(m);
// }
// console.log(genFunction('{var a=2,c;b=4,t$y_p0e=type_$==1?2:1}').code)

/**
 * 将字符串转为function
 * 
 * @param {string} expression 转化为function的表达式，如：
 *      {user.name+user.age} 或 
 *      {var a=2,c=2,b;b=name+tt,t$y_p0e=type_$==1?2:1}
 */
function genFunction(expression) {
    if (!testRegExp(rmatch, expression)) return;

    var variables;
    var isGlobal = false;

    var content = FILTERS_VARS + 'try{return \'' +
        expression
            .replace(/\\/g, '\\\\').replace(/'/g, '\\\'')
            .replace(rmatch, function (match, exp) {

                return '\'+(' +
                    exp.replace(/\\\\/g, '\\')
                        .replace(/\\'/g, '\'')
                        .replace(EXPRESSION_RE, function (match, vars, prefix, name) {

                            if (vars) {
                                var m;
                                while (m = VARS_RE.exec(vars)) {
                                    (variables || (variables = [])).push(m[1]);
                                }
                                return vars + ',';

                            } else if (!name) {
                                return match;

                            } else if (name.indexOf("global.") == 0) {
                                isGlobal = true;
                            }
                            return prefix + valueExpression(name, variables);
                        }) +
                    ')+\'';
            }) +
        '\';}catch(e){console.error(e);console.log($data,arguments.callee.toString());return \'\';}';

    content = content.replace('return \'\'+', 'return ').replace(/\+\'\'/g, '')

    if (variables && variables.length) {
        content = 'var ' + variables.join(',') + ';' + content
    }

    return {
        isGlobal: isGlobal,
        code: content,
        variables: variables
    };
}


function updateParentAttrTo(model) {
    var parent = model.parent;

    if (!parent) {

    } else if (parent instanceof Collection) {
        var index = parent.indexOf(model);
        if (index != -1) {
            parent.array[index] = model.attributes;
        }

    } else {
        parent.attributes[model._key] = model.attributes;
    }
}

function updateModelOnKeys(model, cover, keys, val) {
    var lastKey = keys.pop();
    var tmp;

    for (var i = 0, len = keys.length; i < len; i++) {
        key = keys[i];

        if (!(model._model[key] instanceof Model)) {
            tmp = model._model[key] = new Model(model, key, {});
            model.attributes[key] = tmp.attributes;

            model = tmp;

        } else {
            model = model._model[key];
        }
    }
    return model.set(cover, lastKey, val);
}

function updateViewNextTick(model) {
    if (model.changed) return;

    model.changed = true;

    if (model.parent instanceof Collection) {
        updateViewNextTick(model.parent);
    }

    model.root.one(DATACHANGED_EVENT, function () {
        model.changed = false;

        model.key && model.root.trigger(new Event(DATACHANGED_EVENT + ":" + model.key, {
            target: model
        }));

        while (model) {
            if (model instanceof Model || model instanceof Collection) {
                model._linkedParents &&
                    model._linkedParents.length &&
                    model.root.trigger(LINKEDCHANGE + ":" + model.cid);
            }
            model = model.parent;
        }

    }).render();
}


// var a = util.query("attr^='somevalue'|c1=1,att2!=2")({
//     attr: 'somevalue11'
// });

// console.log(a);

// var a = "someattr.collection[attr^='somevalue',att2=2][1].aaa[333]";

// var attr;
// var query;

// RE_QUERY.lastIndex = 0;
// for (var m = RE_QUERY.exec(a); m; m = RE_QUERY.exec(a)) {
//     attr = m[1];
//     query = m[2];

//     console.log(attr, query, a.substr(m.index + m[0].length))
// }

// console.log("[attr^='somevalue',att2=2][+1].aaa[333]".match(RE_COLL_QUERY));
// console.log(util.query("[attr!=undefined]", [{ attr: 1 }]))
var RE_QUERY = /(?:^|\.)([_a-zA-Z0-9]+)(\[(?:'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^\]])+\](?:\[[\+\-]?\d*\])?)?/g;
var RE_COLL_QUERY = /\[((?:'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^\]])+)\](?:\[([\+\-]?)(\d+)?\])?(?:\.(.*))?/;


var Model = util.createClass({

    constructor: function (parent, key, attributes) {

        if (parent instanceof Model) {
            this.key = parent.key ? parent.key + '.' + key : key;
            this._key = key;

        } else if (parent instanceof Collection) {
            this.key = parent.key + '^child';
            this._key = parent._key + '^child';

        } else {
            throw new Error('Model\'s parent mast be Collection or Model');
        }

        this.cid = util.guid();

        this.type = typeof attributes == 'object' ? 'object' : 'value';
        this.attributes = this.type == 'object' ? extend({}, attributes) : attributes;

        this._model = {};
        this.parent = parent;
        this.root = parent.root;
        this.changed = false;

        this.set(attributes);
    },

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
    _: function (search, def) {

        var attr;
        var query;
        var result = this;

        RE_QUERY.lastIndex = 0;
        for (var m = RE_QUERY.exec(search); m; m = RE_QUERY.exec(search)) {
            attr = m[1];
            query = m[2];

            if (result instanceof Model) {
                result = result._model[attr];

                if (query && result instanceof Collection) {
                    return result._(query + search.substr(m.index + m[0].length), def);
                }
            }
            else if (!result)
                return def === undefined ? null : def;
            else
                result = result[attr]
        }
        return !result && def !== undefined ? def : result;
    },

    get: function (key) {
        if (typeof key === 'undefined')
            return this.attributes;

        if (typeof key == 'string' && key.indexOf('.') != -1) {
            key = key.split('.');
        }

        var data;
        if (isArray(key)) {
            data = this.attributes;

            for (var i = key[0] == 'this' ? 1 : 0, len = key.length; i < len; i++) {
                if (!(data = data[key[i]]))
                    return null;
            }

        } else if (key == 'this') {
            return this.attributes;

        } else {
            data = this.attributes[key];
        }

        return data;
    },

    getJSON: function (key) {
        var data = this.get(key);

        return data === null ? null : typeof data == 'object' ? extend(true, isArray(data) ? [] : {}, data) : data;
    },

    toJSON: function () {
        return extend(true, {}, this.attributes);
    },

    //[cover,object]|[cover,key,val]|[key,va]|[object]
    //@cover=true|false 是否覆盖数据，[cover,key,val]时覆盖子model数据,[cover,object]时覆盖当前model数据
    set: function (cover, key, val) {
        var self = this,
            model,
            origin,
            changed,
            attrs,
            parent,
            keys,
            coverChild = false,
            root = this.root;

        if (typeof cover != "boolean")
            val = key, key = cover, cover = false;

        var isArrayKey = isArray(key);

        if (key === null) {
            this.reset();
            this.attributes = null;
            return this;

        } else if (!isArrayKey && typeof key == 'object') {
            attrs = key;

        } else if (typeof val == 'undefined') {
            val = key;
            key = '';

            if (this.attributes != val) {
                this.attributes = val;

                updateParentAttrTo(this);

                updateViewNextTick(this);
            }
            return this;

        } else {
            keys = isArrayKey ? key : key.split('.');

            if (keys.length > 1) {
                model = updateModelOnKeys(this, cover, keys, val);

                if (model.changed) {
                    updateViewNextTick(this);
                }
                return this;

            } else {
                coverChild = cover;
                cover = false;
                (attrs = {})[key] = val;
            }
        }
        if (this.attributes === null || !$.isPlainObject(this.attributes))
            this.attributes = {}, updateParentAttrTo(this);

        var data = this.attributes;
        model = this._model;

        if (cover) {
            for (var attr in data) {
                if (attrs[attr] === undefined) {
                    attrs[attr] = null;
                }
            }
        }

        var hasChange = false;
        var valueType;
        var changes = [];

        for (var attr in attrs) {
            origin = model[attr];
            value = attrs[attr];

            if (origin !== value) {
                if (value instanceof Model || value instanceof Collection) {
                    model[attr] = value;
                    data[attr] = value instanceof Collection ? value.array : value.attributes;

                    if (origin instanceof Model || origin instanceof Collection) {
                        unlinkModels(self, origin);
                    }

                    linkModels(self, value, model.key ? model.key + '.' + attr : attr);

                    hasChange = true;

                } else if (origin instanceof Model) {

                    if (value === null || value === undefined) {
                        origin.reset();
                        origin.attributes = null;

                    } else {
                        origin.set(coverChild, value);
                    }
                    data[attr] = origin.attributes;

                    if (!hasChange && origin.changed) hasChange = true;

                } else if (origin instanceof Collection) {
                    if (!isArray(value)) {
                        if (value == null) {
                            value = [];
                        } else {
                            throw new Error('[Array to ' + (typeof value) + ' error]不可改变' + attr + '的数据类型');
                        }
                    }

                    origin.set(value);
                    data[attr] = origin.array;

                    if (!hasChange && origin.changed) hasChange = true;

                } else if (isThenable(value)) {
                    value.then(function (res) {
                        self.set(attr, res);
                    });

                } else {
                    valueType = value === null || value === undefined ? null : toString.call(value);

                    switch (valueType) {
                        case '[object Object]':
                            value = new Model(this, attr, value);
                            model[attr] = value;
                            data[attr] = value.attributes;
                            break;

                        case '[object Array]':
                            value = new Collection(this, attr, value);
                            model[attr] = value;
                            data[attr] = value.array;
                            break;

                        default:
                            changes.push(this.key ? this.key + "." + attr : attr, value, data[attr]);
                            data[attr] = model[attr] = value;
                            break;
                    }

                    hasChange = true;
                }
            }
        }

        if (hasChange) {
            updateViewNextTick(this);

            for (var i = 0, length = changes.length; i < length; i += 3) {
                root.trigger(new Event("change:" + changes[i], {
                    target: this

                }), changes[i + 1], changes[i + 2]);
            }
        }

        return self;
    },

    contains: function (model) {
        if (model === this) return false;

        for (var parent = model.parent; parent; parent = model.parent) {
            if (parent === this) return true;
        }
        return false;
    },

    /**
     * 监听当前 Model 的属性值变化
     */
    change: function (attributeName, fn) {
        var self = this;

        this.root.on("change:" + attributeName, function (e, oldValue, newValue) {
            if (e.target === this) {
                return fn.call(self, e, oldValue, newValue);
            }
        });
    },

    /**
     * 监听子 Model / Collection 变化
     */
    observe: function (key, fn) {
        if (typeof key === 'function') {
            fn = key;
            key = this.key || '';
        } else {
            key = ':' + (this.key ? this.key + '.' + key : key);
        }

        var self = this;
        var cb = function (e) {
            if (e.target === self || self.contains(e.target)) {
                return fn.call(self, e);
            }
        }
        cb._cb = fn;

        return this.root.on(DATACHANGED_EVENT + key, cb);
    },

    unobserve: function (key, fn) {
        if (typeof key === 'function') {
            fn = key;
            key = this.key || '';
        } else {
            key = ':' + (this.key ? this.key + '.' + key : key);
        }

        return this.root.off(DATACHANGED_EVENT + key, fn);
    },

    reset: function () {
        var data = {};
        for (var key in this.attributes) {
            data[key] = null;
        }
        this.set(data);
    },

    collection: function (key) {
        !key && (key = 'collection');

        var result = this._(key);

        if (result == null) {
            this.set(key, []);

            return this._model[key];
        }
        return result;
    },

    model: function (key) {

        if (!this._model[key])
            this.set(key, {});

        return this._model[key];
    }

});


var Collection = function (parent, attributeName, array) {
    if (isArray(parent)) {
        array = parent;
        parent = null;
    }

    if (!parent) parent = new ViewModel(false);

    if (!attributeName) attributeName = "$list";

    this.cid = util.guid();

    this.parent = parent;
    this.key = parent.key ? (parent.key + "." + attributeName) : attributeName;
    this._key = attributeName;

    this.root = parent.root;
    this.changed = false;

    this.array = [];
    parent.attributes[attributeName] = this.array;

    if (array) this.add(array);
}

Collection.prototype = {

    length: 0,

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
    _: function (search, def) {

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
        var index = match[3] ? parseInt(match[3]) : operation == '+' ? 0 : undefined;

        var test = util.query(query);
        var array = this.array;

        // 移除操作
        if (operation == '-') {
            var j = 0;
            var results = [];
            var from = index === undefined ? 0 : index;
            var to = index === undefined ? array.length : index;

            for (var i = 0, n = array.length; i < n; i++) {
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
            var results = [];
            for (var i = 0, n = array.length; i < n; i++) {
                if (test(array[i])) {

                    results.push(next ? this[i]._(next) : this[i]);
                }
            }
            return results;

        } else {

            // 根据条件查询，并返回第n个结果
            var j = 0;
            for (var i = 0, n = array.length; i < n; i++) {
                if (test(array[i])) {
                    if (j === index) {
                        return next ? this[i]._(next) : this[i];
                    }
                    j++;
                }
            }
            return operation == '+' ? this.add(def ? def : {}) : null;
        }
    },

    size: function () {
        return this.array.length;
    },

    map: function (fn) {
        return util.map(this.array, fn);
    },

    indexOf: function (key, val) {
        return key instanceof Model ? Array.prototype.indexOf.call(this, key) :
            util.indexOf(this.array, key, val);
    },

    lastIndexOf: function (key, val) {
        return key instanceof Model ? Array.prototype.lastIndexOf.call(this, key) :
            util.lastIndexOf(this.array, key, val);
    },

    get: function (i) {
        if (i == undefined) return this.array;

        return this[i].get();
    },

    toJSON: function () {
        return extend(true, [], this.array);
    },

    set: function (array) {

        if (!array || array.length == 0) {
            this.clear();

        } else {
            var modelsLen = this.length;

            if (array.length < modelsLen) {
                this.splice(array.length, modelsLen - array.length)
            }

            var i = 0;
            var hasChange = this.changed;
            var item;

            this.each(function (model) {
                item = array[i];

                if (item instanceof Model) {

                    if (item != model) {
                        if (!hasChange) {
                            hasChange = true;
                        }
                        unlinkModels(this, model);
                        linkModels(this, item, this.key + '^child');

                        this[i] = item;
                        this.array[i] = item.array;
                    }

                } else {
                    model.set(true, item);
                    if (!hasChange && model.changed) {
                        hasChange = true;
                    }
                }

                i++;
            });

            this.add(i == 0 ? array : array.slice(i, array.length));

            if (!this.changed && hasChange) {
                updateViewNextTick(this);
            }
        }
        return this;
    },


    add: function (array) {
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

                if (dataItem instanceof Model) {

                    linkModels(this, dataItem, this.key + '^child');
                    model = dataItem;
                } else {
                    model = new Model(this, this.length, dataItem);
                }

                this[this.length++] = model;

                this.array.push(model.attributes);

                results.push(model);
            }

            updateViewNextTick(this);
        }
        return dataIsArray ? results : results[0];
    },

    /**
     * 根据 Model 的 attributeName 更新Model
     * collection.updateBy('id', 123, { name: '更新掉name' })
     * 
     * @param {String} attributeName 属性名
     * @param {any} val 属性值
     * @param {Object} data
     * 
     * @return {Collection} self
     */
    updateBy: function (attributeName, val, data) {
        var array = this.array;
        for (var i = 0; i < array.length; i++) {
            if (array[i][attributeName] === val) {
                this[i].set(data);
            }
        }
        return this;
    },

    /**
     * 更新 collection 中的 model
     * 
     * @param {array} arr 需要更新的数组
     * @param {string|function} primaryKey 唯一健 或 (a, b)=>boolean
     * @param {boolean|undefined} [updateType] 更新类型
     * updateType=undefined:collection中存在既覆盖，不存在既添加
     * updateType=true:根据arr更新，不在arr中的项将被删除
     * updateType=false:只更新collection中存在的
     * 
     * @return {Collection} self
     */
    update: function (arr, primaryKey, updateType) {
        if (typeof arr === 'boolean')
            arr = [arr, primaryKey, updateType], updateType = arr[0], primaryKey = arr[2], arr = arr[1];

        if (!arr) {
            return this;
        }

        var fn;
        var length = this.length;

        if (!length) {
            (updateType !== false) && this.add(arr);

            return this;
        }

        if (typeof primaryKey === 'string') {
            fn = function (a, b) {
                return a[primaryKey] == b[primaryKey];
            }
        } else fn = primaryKey;

        var item;
        var arrItem;
        var exists;

        if (!isArray(arr)) arr = [arr];
        else arr = [].concat(arr);

        var n = arr.length;
        var result;


        for (var i = length - 1; i >= 0; i--) {
            item = this.array[i];
            exists = false;

            for (var j = 0; j < n; j++) {
                arrItem = arr[j];

                if (arrItem !== undefined) {
                    if (result = fn.call(this, item, arrItem)) {
                        this[i].set(typeof result == 'object' ? result : arrItem);
                        arr[j] = undefined;
                        exists = true;
                        break;
                    }
                }
            }

            if (updateType === true && !exists) {
                this.splice(i, 1);
            }
        }

        if (updateType !== false) {
            var appends = [];
            for (var i = 0, n = arr.length; i < n; i++) {
                if (arr[i] !== undefined) {
                    appends.push(arr[i]);
                }
            }

            if (appends.length) {
                this.add(appends);
            }
        }

        return this;
    },

    // 已有项将被增量覆盖，不在arr中的项将被删除
    updateTo: function (arr, primaryKeyOrFunc) {

        return this.update(arr, primaryKeyOrFunc, true);
    },

    // 只更新collection中匹配到的
    updateMatched: function (arr, primaryKeyOrFunc) {
        return this.update(arr, primaryKeyOrFunc, false);
    },

    unshift: function (data) {
        return this.insert(0, data);
    },

    insert: function (index, data) {

        var model;
        var count;

        if (!isArray(data)) {
            data = [data];
        }

        for (var i = 0, dataLen = data.length; i < dataLen; i++) {
            var dataItem = data[i];

            if (dataItem instanceof Model) {
                model = dataItem;
                linkModels(this, model, this.key + '^child');
            } else {
                count = index + i;
                model = new Model(this, count, dataItem);
            }

            Array.prototype.splice.call(this, count, 0, model)

            this.array.splice(count, 0, model.attributes);
        }

        updateViewNextTick(this);
        return this;
    },

    splice: function (start, count, data) {
        if (!count) count = 1;
        var root = this.root;
        var spliced = Array.prototype.splice.call(this, start, count);
        if (root._linkedModels) {
            var self = this;

            spliced.forEach(function (model) {
                model._linkedParents && unlinkModels(self, model);
            });
        }

        this.array.splice(start, count);

        if (data)
            this.insert(start, data);
        else
            updateViewNextTick(this);

        return spliced;
    },

    /**
     * 移除Model
     * 
     * @param {String|Model|Function} key 删除条件，(arrayItem)=>boolean
     * @param {any} val
     */
    remove: function (key, val) {
        var fn;

        if (typeof key === 'string' && val !== undefined) {
            fn = function (item) {
                return item[key] == val;
            }

        } else if (key instanceof Model) {
            fn = function (item, i) {
                return this[i] == key;
            }

        } else fn = key;

        for (var i = this.length - 1; i >= 0; i--) {
            if (fn.call(this, this.array[i], i)) {
                Array.prototype.splice.call(this, i, 1);
                this.array.splice(i, 1);
            }
        }

        updateViewNextTick(this);

        return this;
    },

    clear: function () {
        if (this.length == 0 && this.array.length == 0) return;
        for (var i = 0; i < this.length; i++) {
            delete this[i];
        }
        this.length = this.array.length = 0;

        updateViewNextTick(this);

        return this;
    },

    each: function (start, end, fn) {

        if (typeof start == 'function') fn = start, start = 0, end = this.length;
        else if (typeof end == 'function') fn = end, end = this.length;

        for (; start < end; start++) {
            if (fn.call(this, this[start], start) === false) break;
        }
        return this;
    },

    find: function (key, val) {
        var fn;

        if (typeof key === 'string' && val !== undefined) {
            fn = function (item) {
                return item[key] == val;
            }
        } else fn = key;

        for (var i = 0; i < this.length; i++) {
            if (fn.call(this, this.array[i], i)) {
                return this[i];
            }
        }
        return null;
    },

    last: function () {

        return this.length === 0 ? null : this[this.length - 1];
    },

    filter: function (key, val) {
        return util.filter(this.array, key, val);
    }
}

Collection.prototype.toArray = Collection.prototype.toJSON;


function RepeatSource(viewModel, el, parent) {
    var self = this;
    var attrRepeat = el.getAttribute('sn-repeat');
    var match = attrRepeat.match(rrepeat);
    var collectionKey = match[3];
    var attrs = collectionKey.split('.');
    var parentAlias = attrs[0];
    var filter = match[4];

    if (filter) {
        var res = genFunction('{' + filter + '}');

        if (res) {
            this.filter = new Function('$data', res.code);
            this.filterIsGlobal = res.isGlobal;
        }
    }

    this.alias = match[1];
    this.loopIndexAlias = match[2];
    this.key = attrs[attrs.length - 1];
    this.parent = parent;
    this.source = el;
    this.children = [];
    this.attrs = attrs;
    this.parentAlias = parentAlias;

    var orderByCode = match[5];
    if (orderByCode) {
        if (orderByCode.indexOf('this.') == 0) {
            self.orderBy = orderByCode.substr(5).replace(/\(.*\)/, '');

        } else {
            self.orderBy = [];

            //@orderByCode=date desc,{somedata} {somevalue}
            orderByCode.split(/\s*,\s*/).forEach(function (sort) {
                sort = sort.split(' ');
                var sortKey = sort[0];
                var sortType = sort[1];

                if (sortKey.charAt(0) == '{' && sortKey.charAt(sortKey.length - 1) == '}') {
                    sortKey = createFunction(viewModel, sortKey).id;
                }

                if (sortType.charAt(0) == '{' && sortType.charAt(sortType.length - 1) == '}') {
                    sortType = createFunction(viewModel, sortType).id;

                } else {
                    sortType = sortType == 'desc' ? false : true;
                }

                self.orderBy.push(sortKey, sortType);
            });
        }

    }

    var replacement = document.createComment(collectionKey);
    replacement.snRepeatSource = this;
    el.parentNode.replaceChild(replacement, el);

    this.replacement = replacement;

    parent && parent.appendChild(this);

    if (parentAlias == 'global') {
        this.isGlobal = true;

        attrs.shift();
        collectionKey = attrs.join('.');

    } else if (parentAlias == 'this') {
        this.isFn = true;
        this.fid = createFunction(viewModel, '{' + collectionKey + '}').id;

        collectionKey = collectionKey.replace(/\./g, '/');

    } else {
        this.isGlobal = false;

        while (parent) {
            if (parent.alias == parentAlias) {
                attrs[0] = parent.collectionKey + '^child';
                collectionKey = attrs.join('.');
                this.offsetParent = parent;
                break;
            }
            parent = parent.parent;
        }
    }

    replacement.snIsGlobal = this.isGlobal || this.filterIsGlobal;

    this.collectionKey = collectionKey;
}

RepeatSource.isRepeatNode = function (node) {
    return node.nodeType == 1 && node.getAttribute('sn-repeat');
}

RepeatSource.prototype.appendChild = function (child) {
    this.children.push(child);
}

var viewModelCache = [];

var ViewModel = Event.mixin(
    Model.extend({

        /**
         * 双向绑定model
         * 
         * @param {String|Element|Boolean} [template] 字符类型或dom元素时为模版
         * @param {Object} [attributes] 属性
         * @param {Array} children 字节点列表
         */
        constructor: function (template, attributes, children) {
            if (template !== false) viewModelCache.push(this);

            if ((typeof attributes === 'undefined' || isArray(attributes)) && (template === undefined || template === null || $.isPlainObject(template)))
                children = attributes, attributes = template, template = this.el;

            this.children = children ? [].concat(children) : [];

            this._render = this._render.bind(this);
            this._handleSnEvent = this._handleSnEvent.bind(this);

            this.cid = util.guid();
            this.snModelKey = 'sn-' + this.cid + 'model';

            this.attributes = extend({}, this.attributes, attributes);

            this.repeats = {};

            this._model = {};
            this._expressions = {
                length: 0
            };
            this.fns = [];
            this.refs = {};
            this.root = this;

            template && this.bind(template);

            this.set(this.attributes);

            this.initialize.call(this, attributes);
        },

        initialize: util.noop,

        //事件处理
        _handleSnEvent: function (e) {
            if (e.type == TRANSITION_END && e.target != e.currentTarget) {
                return;
            }
            var target = e.currentTarget;
            var eventCode = target.getAttribute('sn-' + this.cid + e.type);
            var fn;
            var ctx;

            if (eventCode == 'false') {
                return false;

            } else if (/^\d+$/.test(eventCode)) {

                var snData = formatData(this, target, target.snData);

                snData.e = e;

                var res = executeFunction(this, eventCode, snData);

                return res;
            }
        },

        dataOfElement: function (el, modelName, value) {
            var attrs = modelName.split('.');
            var model;

            if (el.snData && attrs[0] in el.snData) {
                model = el.snData[attrs.shift()];
            } else {
                model = this;
            }

            if (arguments.length == 3) {
                model.set(attrs, value);
                return this;
            }

            return model.get(attrs);
        },

        bind: function (el) {

            var self = this;
            var $el = $(el).on('input change blur', '[' + this.snModelKey + ']', function (e) {
                var target = e.currentTarget;

                switch (e.type) {
                    case 'change':
                    case 'blur':
                        switch (target.tagName) {
                            case 'TEXTAREA':
                                return;
                            case 'INPUT':
                                switch (target.type) {
                                    case 'hidden':
                                    case 'radio':
                                    case 'checkbox':
                                    case 'file':
                                        break;
                                    default:
                                        return;
                                }
                                break;
                        }
                        break;
                }

                self.dataOfElement(target, target.getAttribute(self.snModelKey), target.value);
            });

            bindElement(this, $el);

            self.$el = (self.$el || $()).add($el);

            $el.each(function () {
                this.snViewModel = self;
            })

            return this;
        },

        nextUpdate: function (cb) {
            return this._nextTick ? this.one('viewDidUpdate', cb) : cb.call(this);
        },

        getRef: function (name, cb) {
            var ref = this.refs[name];

            if (ref) {
                if (!cb) return ref;
                else cb.call(this, ref);

            } else {

                var self = this;
                var getRef = function (resolve) {

                    self.onceTrue('viewDidUpdate', function () {

                        if (this.refs[name]) {
                            resolve.call(this, this.refs[name]);
                            return true;
                        }
                    });
                }

                if (cb) {
                    getRef(cb);

                } else {

                    return new Promise(getRef)
                }
            }
        },

        isOwnNode: function (node) {
            if (typeof node == 'string') {
                return !this.$el.find(node).length;

            } else {
                var flag = true;
                this.$el.each(function () {
                    if (!$.contains(this, node)) return false;
                });
                return flag;
            }
        },

        before: function (newNode, referenceNode) {

            referenceNode = checkOwnNode(this, referenceNode);

            return bindNewElement(this, newNode)
                .insertBefore(referenceNode);
        },

        after: function (newNode, referenceNode) {
            referenceNode = checkOwnNode(this, referenceNode);

            return bindNewElement(this, newNode)
                .insertAfter(referenceNode);
        },

        append: function (newNode, parentNode) {
            parentNode = checkOwnNode(this, parentNode);

            return bindNewElement(this, newNode)
                .appendTo(parentNode);
        },

        prepend: function (newNode, parentNode) {
            parentNode = checkOwnNode(this, parentNode);

            return bindNewElement(this, newNode)
                .prependTo(parentNode);
        },

        render: function () {
            if (!this._nextTick) {
                this._nextTick = this._rendering ? 1 : requestAnimationFrame(this._render);
            }
        },

        _render: function () {
            this._rendering = true;

            this.viewWillUpdate && this.viewWillUpdate();

            console.time('render-' + this.cid);

            var self = this;

            do {
                this.trigger(new Event(DATACHANGED_EVENT, {
                    target: this
                }));

                this._nextTick = null;
                this.refs = {};

                eachElement(this.$el, function (el) {
                    if (el.snViewModel && el.snViewModel != self || self._nextTick) return false;

                    return updateNode(self, el);
                });

            } while (this._nextTick);

            console.timeEnd('render-' + this.cid);

            this._rendering = false;

            this.viewDidUpdate && this.viewDidUpdate();
            this.trigger('viewDidUpdate');
        },

        destroy: function () {
            this.$el.off('input change blur', '[' + this.snModelKey + ']')
                .each(function () {
                    this.snViewModel = null;
                });

            for (var key in EVENTS) {
                var eventName = EVENTS[key];
                var attr = '[sn-' + this.cid + eventName + ']';

                this.$el.off(eventName, attr, this._handleSnEvent);
            }

            for (var i = 0, len = viewModelCache.length; i < len; i++) {
                if (viewModelCache[i] == this) {
                    viewModelCache.splice(i, 1);
                    break;
                }
            }

            var children = this._linkedModels;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    var link = children[i];
                    var childModel = link.childModel;
                    var linkedParents = childModel._linkedParents;

                    linkedParents.splice(linkedParents.indexOf(link), 1);
                    childModel.root.off(LINKEDCHANGE + ':' + childModel.cid, link.cb);
                }
            }

        }

    })
);

ViewModel.prototype.next = ViewModel.prototype.nextUpdate;

var global = new ViewModel();

global._render = function () {

    viewModelCache.forEach(function (viewModel) {
        var refs = {};

        eachElement(viewModel.$el, function (el) {
            if (el.snViewModel && el.snViewModel != viewModel) return false;

            if (el.snIsGlobal) {
                if (el.nodeType == 1) {
                    var ref = el.getAttribute('ref');
                    if (ref && !refs[ref]) {
                        viewModel.refs[ref] = null;
                        refs[ref] = true;
                    }
                }
                return updateNode(viewModel, el);
            }
        });
    });

    global._nextTick = null;
};

ViewModel.prototype.global = exports.global = global;

exports.ViewModel = exports.Model = ViewModel;

exports.createModel = function (props) {

    var attributes;
    if (props.attributes) {
        attributes = props.attributes;
        delete props.attributes;
    }

    return Object.assign(new ViewModel(attributes), props);
}

exports.Collection = Collection;

exports.createCollection = function (props) {

    var array;
    if (props.array) {
        array = props.array;
        delete props.array;
    }

    return Object.assign(new Collection(array), props);
}
