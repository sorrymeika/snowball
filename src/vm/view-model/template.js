import { isArray, isNo } from '../../utils/is';
import { $, TEXT_NODE, ELEMENT_NODE, eachElement, insertElementAfter, fade } from '../../utils/dom';
import FunctionCompiler from './FunctionCompiler';
import {
    createCompilerManager,
    createNodeHandler,
    createAttributeHandler
} from './factories';
import getFunctionArg from './getFunctionArg';
import { TYPEOF } from '../predicates';

function isViewModel(model) {
    return model && model[TYPEOF] === 'ViewModel';
}

function isExpression(val) {
    return val.indexOf("{") !== -1 && val.lastIndexOf("}") !== -1;
}

export class TemplateCompiler {
    constructor(viewModel) {
        this.viewModel = viewModel;
        this.functionCompiler = new FunctionCompiler(viewModel);

        this.compilerManager = createCompilerManager(this);
        this.nodeHandler = createNodeHandler(this);
        this.attributeHandler = createAttributeHandler(this);
    }

    compile($element) {
        var viewModel = this.viewModel;

        $element.each((i, root) => {
            eachElement(root, (node) => {
                if (node.snViewModel && node.snViewModel != viewModel) return false;
                return this.compileNode(node, root);
            });
        });

        this.compilerManager.reduce($element);
        this.functionCompiler.compile();

        return $element;
    }

    compileNode(node, root) {
        var fid;
        var nodeType = node.nodeType;

        if (nodeType == TEXT_NODE) {
            fid = this.functionCompiler.push(node.nodeValue, true, true);
            if (fid) {
                node.snAttributes = ['nodeValue', fid];
                node.nodeValue = '';
            }
            return;
        } else if (nodeType == ELEMENT_NODE) {
            var result = this.nodeHandler.reduce(node);
            this.compileAttributes(node, root);
            return result;
        }
    }

    compileAttributes(el, root) {
        var attr;
        var val;
        var attributes = el.attributes;
        var attributeHandler = this.attributeHandler;

        for (var i = attributes.length - 1; i >= 0; i--) {
            val = attributes[i].value;
            if (val) {
                attr = attributes[i].name;
                if (attr.slice(0, 3) === "sn-") {
                    switch (attr) {
                        case 'sn-src':
                        case 'sn-html':
                        case 'sn-display':
                        case 'sn-style':
                        case 'sn-css':
                        case 'sn-image':
                            attributeHandler.compile(el, attr, val, isExpression(val));
                            break;
                        default:
                            attributeHandler.reduce(el, attr, val, root);
                            break;
                    }
                } else {
                    if (attr === 'ref' && !isExpression(val)) {
                        val = "{'" + val + "'}";
                    }
                    attributeHandler.compile(el, attr, val);
                }
            }
        }
    }

    updateNode(node, data) {
        return this.nodeHandler.update(node, data);
    }

    updateAttributes(nodeData) {
        var el = nodeData.node;
        var snAttributes = el.snAttributes;
        if (!snAttributes) return;

        var snValues = (el.snValues || (el.snValues = []));
        var attributeHandler = this.attributeHandler;
        var args = getFunctionArg(el, nodeData.data);

        for (var i = 0, n = snAttributes.length; i < n; i += 2) {
            var attrName = snAttributes[i];
            var val = this.executeFunction(snAttributes[i + 1], args);

            if (attributeHandler.beforeUpdate(nodeData, attrName, val) === false) {
                continue;
            }

            if (snValues[i / 2] === val) continue;
            snValues[i / 2] = val;

            switch (attrName) {
                case 'nodeValue':
                    updateTextNode(el, val);
                    break;
                case 'value':
                    var nodeName = el.nodeName;
                    if (nodeName === 'INPUT' || nodeName === 'SELECT' || nodeName === 'TEXTAREA') {
                        if (el.value != val || (el.value === '' && val === 0)) {
                            el.value = val;
                        }
                    } else
                        el.setAttribute(attrName, val);
                    break;
                case 'html':
                case 'sn-html':
                    el.innerHTML = val;
                    break;
                case 'sn-visible':
                case 'display':
                    el.style.display = isNo(val) ? 'none' : val == 'block' || val == 'inline' || val == 'inline-block' ? val : '';
                    break;
                case 'sn-display':
                    fade(el, val);
                    break;
                case 'classname':
                case 'class':
                    el.className = val;
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
                    (el[attrName] = !!val) ? el.setAttribute(attrName, attrName) : el.removeAttribute(attrName);
                    break;
                case 'sn-image':
                case 'src':
                    if (val) {
                        el.src = val;
                    } else {
                        el.removeAttribute('src');
                    }
                    break;
                case 'sn-src':
                    if (val) {
                        if (el.src || el.nodeName !== 'IMG') {
                            el.src = val;
                        } else {
                            $(el)
                                .one('load error', function (e) {
                                    if (e.type === 'error') {
                                        el.removeAttribute('src');
                                        el.style.opacity = "";
                                    } else {
                                        $(el).animate({
                                            opacity: 1
                                        }, 200);
                                    }
                                })
                                .css({
                                    opacity: .3
                                })
                                .attr({
                                    src: val
                                });
                        }
                    } else {
                        el.removeAttribute('src');
                    }
                    break;
                default:
                    val === null || val === false ? el.removeAttribute(attrName) : el.setAttribute(attrName, val);
                    break;
            }

            attributeHandler.update(el, attrName, val);
        }
    }

    compileToFunction(expression, withBraces) {
        return this.functionCompiler.push(expression, withBraces);
    }

    executeFunction(fid, data) {
        return this.functionCompiler.executeFunction(fid, data);
    }
}

function updateTextNode(el, val) {
    var removableTails = el.snTails;

    if (isArray(val) || (typeof val === 'object' && val.nodeType && (val = [val]))) {
        const newTails = [];
        let node = el;

        val.reduce((res, item) => {
            if (isViewModel(item))
                return res.concat(item.nodes());
            else if (Array.isArray(item))
                return res.concat(item);
            res.push(item);
            return res;
        }, []).forEach(function (item) {
            if (item == null) item = '';
            const nextSibling = node.nextSibling;

            if (nextSibling !== item) {
                if (
                    (item && item.nodeType) || (
                        (!nextSibling ||
                            nextSibling.nodeType !== TEXT_NODE ||
                            nextSibling.nodeValue !== "" + item) &&
                        (item = document.createTextNode(item))
                    )
                ) {
                    insertElementAfter(node, item);
                } else {
                    item = nextSibling;
                }
            }
            if (removableTails) {
                const index = removableTails.indexOf(item);
                if (index !== -1) {
                    removableTails.splice(index, 1);
                }
            }
            node = item;
            newTails.push(item);
        });

        el.nodeValue = '';
        el.snTails = newTails;
    } else {
        el.nodeValue = val;
        el.snTails = null;
    }
    if (removableTails) {
        removableTails.forEach(function (tail) {
            if (tail.parentNode) tail.parentNode.removeChild(tail);
        });
    }
}