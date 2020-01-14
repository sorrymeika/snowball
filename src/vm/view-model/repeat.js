import { ELEMENT_NODE, COMMENT_NODE, cloneElement, closestElement, insertElementAfter } from '../../utils/dom';
import { get as valueOfObject } from '../../utils/object';
import { castPath } from '../../utils/castPath';
import { isNumber } from '../../utils/is';
import compileExpression from './compileExpression';
import { findChildModel } from '../methods/findChildModel';
import { Collection } from '../Collection';
import NodeUpdateResult from './NodeUpdateResult';
import { cloneEvents } from './events';
import getFunctionArg from './getFunctionArg';

const SN_REPEAT = 'sn-repeat';

export function isRepeatableNode(node) {
    return node.nodeType === ELEMENT_NODE && node.getAttribute(SN_REPEAT);
}

var ORDER_BY_THIS_FUNCTION = 1;
var ORDER_BY_DELEGATE_FUNCTION = 2;
var ORDER_BY_ATTRIBUTES_FUNCTION = 3;

// 匹配repeat:
// 1. item, i in collection|filter:i==1&&contains(item, { name: 1 })|orderBy:date desc, name asc
// 2. item in collection|filter:this.filter(item, i)|orderBy:this.sort()
// 3. item in collection|orderBy:{column} asc, name {ascOrDesc}
var RE_REPEAT = /([\w$]+)(?:\s*,\s*([\w$]+)){0,1}\s+in\s+([\w$]+(?:\.[\w$(,)]+|\[\d+\]){0,})(?:\s*\|\s*filter\s*:\s*(.+?)){0,1}(?:\s*\|\s*orderBy:(.+)){0,1}(\s|$)/;

function initCollectionKey(template, compiler, collectionKey) {
    if (collectionKey.slice(-1) == ')') {
        compiler.isFn = true;
        compiler.fid = template.compileToFunction(compiler.vm, collectionKey, false);

        compiler.collectionKey = collectionKey.replace(/\./g, '/');
    } else {
        var attrs = castPath(collectionKey);
        var parentAlias = attrs[0];
        var parent = compiler.parent;

        while (parent) {
            if (parent.alias == parentAlias) {
                attrs.shift();
                compiler.offsetParent = parent;
                break;
            }
            parent = parent.parent;
        }
        compiler.collectionKeys = attrs;
    }
}


function updateRepeatView(template, nodeData) {
    var el = nodeData.node;
    var viewModel = template.viewModel;
    var repeatCompiler = el.snRepeatCompiler;
    var collection = el.snCollection;
    var model;
    var offsetParent = repeatCompiler.offsetParent;
    var parentSNData = nodeData.data;
    var collectionData;

    if (repeatCompiler.isFn) {
        collectionData = template.executeFunction(repeatCompiler.fid, getFunctionArg(el, parentSNData));
    }

    if (!collection) {
        if (!offsetParent) {
            model = viewModel;
        } else {
            closestElement(el, function (parentNode) {
                if (parentNode.snRepeatCompiler == offsetParent) {
                    model = parentNode.snModel;
                    return true;
                }
            });
        }

        if (repeatCompiler.isFn) {
            collection = new Collection(collectionData, repeatCompiler.collectionKey, viewModel);
        } else {
            collection = model && findChildModel(model, repeatCompiler.collectionKeys);
        }

        if (!collection) return;

        el.snCollection = collection;
    } else if (repeatCompiler.isFn) {
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

        for (var j = 0; j < elementsLength; j++) {
            if (elements[j].snModel == model) {
                elemContain[j] = true;
                elem = elements[j];
                elemIndex = j;
                break;
            }
        }

        if (!elem) {
            snData = Object.create(parentSNData);
        } else {
            snData = Object.assign(Object.create(parentSNData), elem.snData);
        }

        snData[repeatCompiler.alias] = model.get();
        snData['__alias__' + repeatCompiler.alias + '__'] = model;

        var pass = !repeatCompiler.filter || repeatCompiler.filter.call(viewModel, getFunctionArg(elem, snData));
        if (pass) {
            if (!elem) {
                elem = cloneRepeatElement(viewModel, repeatCompiler.source, snData);

                elem.snRepeatCompiler = repeatCompiler;
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

    var orderBy = repeatCompiler.orderBy;
    if (orderBy) {
        var sortFn;
        switch (repeatCompiler.orderByType) {
            case ORDER_BY_THIS_FUNCTION:
                sortFn = valueOfObject(viewModel, orderBy);
                break;
            case ORDER_BY_DELEGATE_FUNCTION:
                sortFn = valueOfObject(viewModel.delegate, orderBy);
                break;
            case ORDER_BY_ATTRIBUTES_FUNCTION:
                sortFn = valueOfObject(viewModel.state.data, orderBy);
                break;
            default:
                // orderBy=['a',true,someFunctionId,false]
                orderBy = orderBy.map(function (item) {
                    if (isNumber(item)) {
                        return template.executeFunction(item, getFunctionArg(el, parentSNData));
                    }
                    return item;
                });

                sortFn = function (am, bm) {
                    var ret = 0;
                    var isDesc;
                    var sort;
                    var a, b;

                    for (var i = 0; i < orderBy.length; i += 2) {
                        sort = orderBy[i];
                        isDesc = orderBy[i + 1] == false;

                        a = am[sort];
                        b = bm[sort];

                        // 中文排序需使用 localeCompare
                        ret = isNumber(a) && isNumber(b)
                            ? a - b
                            : ((a === undefined || a === null) ? '' : (a + '')).localeCompare(b);
                        isDesc && (ret *= -1);

                        if (ret != 0) return ret;
                    }

                    return ret;
                };
        }
        sortFn && list.sort(function (a, b) {
            return sortFn(a.model.state.data, b.model.state.data);
        });
    }

    list.forEach(function (item, index) {
        var elem = item.el;

        insertElementAfter(cursorElem, elem);
        cursorElem = elem;

        if (repeatCompiler.loopIndexAlias) {
            elem.snData[repeatCompiler.loopIndexAlias] = index;
        }
    });

    var refs = [];
    // 移除过滤掉的element
    for (var i = 0; i < elementsLength; i++) {
        var elem = elements[i];
        if (!elemContain[i]) {
            elem.parentNode && elem.parentNode.removeChild(elem);
        } else {
            refs.push(elem);
        }
    }

    nodeData.setRef(refs);

    return cursorElem;
}

function cloneRepeatElement(viewModel, source, snData) {
    return cloneElement(source, function (node, clone) {
        clone.snData = snData;
        clone.snIsRepeat = true;

        if (node.snAttributes) clone.snAttributes = node.snAttributes;
        cloneEvents(viewModel, node, clone);

        if (node.snComponent) clone.snComponent = node.snComponent;
        if (node.snProps) clone.snProps = node.snProps;

        if (node.snRepeatCompiler) clone.snRepeatCompiler = node.snRepeatCompiler;
        if (node.snIfSource) {
            var snIfSource = cloneRepeatElement(viewModel, node.snIfSource, snData);
            clone.snIfSource = snIfSource;
            clone.snIfType = snIfSource.snIfType = node.snIfSource.snIfType;
            clone.snIfFid = snIfSource.snIfFid = node.snIfSource.snIfFid;
            snIfSource.snIf = clone;
        }
    });
}

export default class RepeatCompiler {

    constructor(template, el, parent) {
        this.template = template;
        this.viewModel = template.viewModel;
        this.source = el;
        this.parent = parent;

        this.compile(el.getAttribute(SN_REPEAT));

        parent && parent.appendChild(this);
    }

    appendChild(child) {
        this.children.push(child);
    }

    compile(str) {
        var match = str.match(RE_REPEAT);
        var collectionKey = match[3];
        var filter = match[4];
        var orderByCode = match[5];

        this.alias = match[1];
        this.loopIndexAlias = match[2];
        this.children = [];

        this.compileFilter(filter);
        this.compileOrderBy(orderByCode);

        var replacement = document.createComment(collectionKey);
        replacement.snRepeatCompiler = this;
        this.source.parentNode.replaceChild(replacement, this.source);
        this.replacement = replacement;

        initCollectionKey(this.template, this, collectionKey);
    }

    compileFilter(filter) {
        if (filter && (filter = compileExpression(filter, false))) {
            this.filter = new Function('$data', filter.code);
        }
    }

    /**
     * @example
     * compileOrderBy('date desc,{somedata} {somevalue}')
     * @param {String} orderByCode
     */
    compileOrderBy(orderByCode) {
        if (!orderByCode) return;

        if (/^([\w$]+)\.([\w$]+(\.[\w$]+)*)$/.test(orderByCode)) {
            switch (RegExp.$1) {
                case 'this':
                    this.orderByType = ORDER_BY_THIS_FUNCTION;
                    this.orderBy = RegExp.$2;
                    break;
                case 'delegate':
                    this.orderByType = ORDER_BY_DELEGATE_FUNCTION;
                    this.orderBy = RegExp.$2;
                    break;
                default:
                    this.orderByType = ORDER_BY_ATTRIBUTES_FUNCTION;
                    this.orderBy = orderByCode;
            }
        } else {
            var orderBy = this.orderBy = [];
            var viewModel = this.viewModel;
            var template = this.template;

            orderByCode.split(/\s*,\s*/).forEach((sort) => {
                var sortKey = (sort = sort.split(' '))[0];
                var sortType = sort[1];

                if (sortKey.charAt(0) == '{' && sortKey.slice(-1) == '}') {
                    sortKey = template.compileToFunction(viewModel, sortKey);
                }
                sortType = (sortType && sortType.charAt(0) == '{' && sortType.slice(-1) == '}')
                    ? template.compileToFunction(viewModel, sortType)
                    : sortType !== 'desc';

                orderBy.push(sortKey, sortType);
            });
        }
    }
}

export class RepeatNodeCompiler {
    constructor(template) {
        this.template = template;
        this.viewModel = template.viewModel;
    }

    compile(node) {
        if (isRepeatableNode(node)) {
            if (process.env.NODE_ENV === 'development') {
                if (node.getAttribute('sn-if')) {
                    throw new Error('can not use sn-if and sn-repeat at the same time!!please use filter instead!!');
                }
            }
            var nextSibling = node.nextSibling;
            var parentRepeatCompiler;
            var parentNode = node;

            while ((parentNode = (parentNode.snIf || parentNode).parentNode) && !parentNode.snViewModel) {
                if (parentNode.snRepeatCompiler) {
                    parentRepeatCompiler = parentNode.snRepeatCompiler;
                    break;
                }
            }

            node.snRepeatCompiler = new RepeatCompiler(this.template, node, parentRepeatCompiler);

            return { nextSibling };
        }
    }

    update(nodeData) {
        var node = nodeData.node;
        if (node.nodeType == COMMENT_NODE && node.snRepeatCompiler) {
            updateRepeatView(this.template, nodeData);
            return new NodeUpdateResult({ isBreak: true });
        }
    }
}
