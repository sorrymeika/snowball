
import { TEXT_NODE, ELEMENT_NODE, nextNotTextNodeSibling } from '../../utils/dom';
import NodeUpdateResult from './NodeUpdateResult';
import { isYes } from '../../utils/is';

const SN_IF = 'sn-if';
const SN_ELSE_IF = 'sn-else-if';
const SN_ELSE = 'sn-else';

function initElementIf(el, type) {
    var snIf = document.createComment(type);
    snIf.snIfSource = el;
    el.snIf = snIf;
    el.snIfType = snIf.snIfType = type;
    if (el.snViewModel) snIf.snViewModel = el.snViewModel;
    if (el.parentNode) {
        el.parentNode.insertBefore(snIf, el);
        el.parentNode.removeChild(el);
    }
    el.snReplacement = snIf;
    el.removeAttribute(type);
    return { nextSibling: snIf.nextSibling };
}

function setFunctionId(template, node, val) {
    node.snIfFid = template.compileToFunction(val.charAt(0) == '{' && val.slice(-1) == '}'
        ? val.slice(1, -1)
        : val, false);
}

function insertIfSourceElement(el) {
    if (!el.parentNode && el.snIf.parentNode) {
        el.snIf.nextSibling
            ? el.snIf.parentNode.insertBefore(el, el.snIf.nextSibling)
            : el.snIf.parentNode.appendChild(el);
    }
}

function updateIfSourceElement(viewModel, el) {
    if (!el.parentNode) {
        if (el.snViewModel) {
            var nextEl = nextNotTextNodeSibling(el.snIf);
            if (nextEl && nextEl.snViewModel === el.snViewModel) {
                return new NodeUpdateResult({
                    nextSibling: nextEl
                });
            }
            return new NodeUpdateResult({ nextSibling: null });
        }
        return new NodeUpdateResult({
            ignoreChildNodes: true,
            nextSibling: el.snIf.nextSibling
        });
    } else {
        var nextElement = el.nextSibling;
        var currentElement = el;

        while (nextElement) {
            if (nextElement.nodeType === TEXT_NODE) {
                nextElement = nextElement.nextSibling;
                continue;
            }

            if (currentElement.snViewModel != nextElement.snViewModel) {
                return new NodeUpdateResult({ nextSibling: nextElement.nextSibling });
            }

            if ((!nextElement.snIf && !nextElement.snIfSource) || nextElement.snIfType == SN_IF) {
                break;
            }

            switch (nextElement.snIfType) {
                case SN_ELSE:
                case SN_ELSE_IF:
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

        return new NodeUpdateResult({
            nextSibling: currentElement.nextSibling
        });
    }
}

export class IfCompiler {

    constructor(template) {
        this.template = template;
        this.viewModel = template.viewModel;
    }

    compile(node, nodeType) {
        if (nodeType == ELEMENT_NODE) {
            var val;
            if ((val = node.getAttribute(SN_IF))) {
                setFunctionId(this.template, node, val);
                return initElementIf(node, SN_IF);
            } else if ((val = node.getAttribute(SN_ELSE_IF))) {
                setFunctionId(this.template, node, val);
                return initElementIf(node, SN_ELSE_IF);
            } else if (node.getAttribute(SN_ELSE) !== null) {
                return initElementIf(node, SN_ELSE);
            }
        }
    }

    update(nodeData) {
        var node = nodeData.node;

        if (node.snIfSource) {
            return new NodeUpdateResult({
                ignoreChildNodes: true,
                isBreak: true,
                canUpdateAttributes: false,
                nextSibling: node.snIfSource
            });
        } else if (node.snIf) {
            switch (node.snIfType) {
                case SN_ELSE:
                    node.snIfStatus = true;
                    insertIfSourceElement(node);
                    break;
                case SN_IF:
                case SN_ELSE_IF:
                    if ((node.snIfStatus = isYes(this.template.executeFunction(node.snIfFid, nodeData.data)))) {
                        insertIfSourceElement(node);
                    } else {
                        if (node.parentNode) {
                            node.parentNode.removeChild(node);
                        }
                        return new NodeUpdateResult({
                            ignoreChildNodes: true,
                            isBreak: true,
                            canUpdateAttributes: false,
                            nextSibling: node.snIf.nextSibling
                        });
                    }
                    break;
                default:
            }
            return updateIfSourceElement(this.viewModel, node);
        }
    }
}