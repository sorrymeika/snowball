import { IVNode } from "./createVNode";
import { isNo, isString } from '../../utils/is';
import { $, fade, TEXT_NODE } from '../../utils/dom';
import { isComponent } from "./component";

export type IElement = {
    vnode: IVNode,
    node: any,
    parent: IElement,
    // 所有子元素
    children: IElement[],
    // 当前可见的子元素
    childElements: IElement[]
}

export function createElement(vnode: IVNode, root: IElement): IElement {
    const result = {
        type: vnode.type,
        vnode
    };
    result.root = root || (root = result);

    const vchildren = vnode.children;
    if (vchildren) {
        const children = result.children = [];

        for (let i = 0; i < vchildren.length; i++) {
            let vchild = vchildren[i];
            let elem = createElement(vchild, root);
            if (vchild.visibleProps) {
                let j = i + 1;
                elem.elses = [];
                while (j < vchildren.length) {
                    const visibleProps = vchildren[j].visibleProps;
                    if (visibleProps && (visibleProps.type == 'else-if' || visibleProps.type == 'else')) {
                        elem.elses.push(createElement(vchildren[j], root));
                        i++;
                    } else {
                        break;
                    }
                }
            }
            elem.parent = result;
            children.push(elem);
        }
    }

    return result;
}

export function isComponentElement(element) {
    return element.vnode && element.vnode.type === 'component';
}

export function prependElement(parentElement, element) {
    let parentNode;
    if (parentElement.vnode) {
        if (isComponentElement(parentElement) || parentElement.vnode.type === 'root') {
            throw new Error(`component can't prepend element!`);
        }
        parentNode = parentElement.node;
    } else {
        parentNode = parentElement;
    }

    if (element.vnode) {
        if (isComponentElement(element)) {
            element.component.prependTo(parentNode);
        } else if (element.vnode.type === 'root') {
            prependNode(parentNode, element.firstNode);
            syncRootChildElements(element);
        } else {
            prependNode(parentNode, element.node);
        }
    } else {
        prependNode(parentNode, element);
    }
}

function prependNode(parentNode, childNode) {
    const firstChild = parentNode.firstChild;
    if (firstChild) {
        if (firstChild !== childNode) {
            parentNode.insertBefore(childNode, firstChild);
        }
    } else {
        parentNode.appendChild(childNode);
    }
}

export function insertElementAfter(destElement, element) {
    let destNode = getInsertAfterNode(destElement);
    if (isComponent(element)) {
        element.insertAfter(destNode);
    } else if (element.vnode) {
        if (isComponentElement(element)) {
            element.component.insertAfter(destNode);
        } else if (element.vnode.type === 'root') {
            insertAfter(destNode, element.firstNode);
            syncRootChildElements(element);
        } else {
            insertAfter(destNode, element.node);
        }
    } else {
        insertAfter(destNode, element);
    }
}

function getInsertAfterNode(element) {
    if (isComponent(element)) {
        return element.lastNode;
    } else if (element.vnode) {
        if (isComponentElement(element)) {
            return element.component.lastNode;
        }
        if (element.vnode.type === 'root') {
            return element.lastNode;
        } else {
            return element.node;
        }
    } else {
        return element;
    }
}

function insertAfter(destNode, newNode) {
    if (destNode.nextSibling != newNode) {
        destNode.nextSibling
            ? destNode.parentNode.insertBefore(newNode, destNode.nextSibling)
            : destNode.parentNode.appendChild(newNode);
    }
}

export function syncRootChildElements(element) {
    const childElements = element.childElements;
    if (childElements) {
        let prevChild = element.firstNode;
        for (let i = 0; i < childElements.length; i++) {
            insertElementAfter(prevChild, childElements[i]);
            prevChild = childElements[i];
        }
        insertElementAfter(prevChild, element.lastNode);
    }
}

export function removeElement(element) {
    if (element.vnode) {
        if (isComponentElement(element)) {
            element.component.remove();
        } else if (element.vnode.type === 'root') {
            const childElements = element.childElements;
            if (childElements) {
                for (let i = childElements.length; i >= 0; i++) {
                    removeElement(childElements[i]);
                }
            }
            removeNode(element.firstNode);
            removeNode(element.lastNode);
        } else {
            removeNode(element.node);
        }
    } else if (isComponent(element)) {
        element.remove();
    } else {
        removeNode(element);
    }
}

function removeNode(node) {
    if (node && node.parentNode) {
        node.parentNode.removeChild(node);
    }
}

export function setAttribute(element, attrName, val) {
    const el = element.node;

    switch (attrName) {
        case '...':
            for (let key in val) {
                setAttribute(element, key, val[key]);
            }
            break;
        case 'nodeValue':
            setTextNode(element, val);
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
}

function setTextNode(element, val) {
    const tails = element.tails || [];

    if (Array.isArray(val) || (typeof val === 'object' && (val.nodeType || val.vnode || isComponent(val)) && (val = [val]))) {
        let cursor = element.node;
        const newTails = [];

        val
            .reduce((res, item) => res.concat(item), [])
            .forEach(function (item) {
                let tail = isString(item)
                    ? findStringTail(tails, item)
                    : findTail(tails, item);

                insertElementAfter(cursor, item);
                cursor = tail;
                newTails.push(tail);
            });

        element.node.nodeValue = '';
        element.tails = newTails;
    } else {
        element.node.nodeValue = val;
        element.tails = null;
    }

    tails.forEach(function (tail) {
        if (tail) {
            removeElement(tail);
        }
    });
}

function findStringTail(tails, nodeValue) {
    for (let i = 0; i < tails.length; i++) {
        let node = tails[i];
        if (node && node.nodeType === TEXT_NODE) {
            node.nodeValue = nodeValue;
            tails[i] = undefined;
            return node;
        }
    }
    return document.createTextNode(nodeValue);
}

function findTail(tails, element) {
    for (let i = 0; i < tails.length; i++) {
        let node = tails[i];
        if (node == element) {
            tails[i] = undefined;
            return node;
        }
    }
    return element;
}