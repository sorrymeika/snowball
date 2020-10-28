/* eslint-disable no-unused-expressions */
import $ from '../core/zepto-lite';
import { isNo } from './is';
import style from './style';

export const TRANSITION_END = $.fx.transitionEnd;

export const TEXT_NODE = document.TEXT_NODE || 3;
export const COMMENT_NODE = document.COMMENT_NODE || 8;
export const ELEMENT_NODE = document.ELEMENT_NODE || 1;

export function reflow(el) {
    if (el.length && el[0]) {
        for (let i = 0; i < el.length; i++) {
            el[i].clientHeight;
        }
    } else {
        el.clientHeight;
    }
    return el;
}

export function getElementOffsetTop(el) {
    var parent = el.offsetParent;
    var top = el.offsetTop;
    while (parent && parent !== document.body) {
        top += parent.offsetTop;
        parent = parent.offsetParent;
    }
    return top;
}

export function insertElementAfter(destElem, elem) {
    if (destElem.nextSibling != elem) {
        destElem.nextSibling
            ? destElem.parentNode.insertBefore(elem, destElem.nextSibling)
            : destElem.parentNode.appendChild(elem);
    }
}

export function closestElement(el, fn) {
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

export function cloneElement(node, each) {
    var stack = [];
    var parentCloneStack = [];
    var nodeClone = node.cloneNode(false);
    var parentNode = nodeClone;
    var nextSibling;
    var clone;

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

export function eachElement(el, fn) {
    if (!el) return;

    var stack = [];
    var firstLoop = true;

    while (el) {
        var res = fn(el);
        var ignoreChildNodes = res === false || (res && res.ignoreChildNodes);
        var nextSibling = res && res.nextSibling
            ? res.nextSibling
            : firstLoop || (res && res.nextSibling) === null
                ? null
                : el.nextSibling;

        if (firstLoop) firstLoop = false;

        if (!ignoreChildNodes && el.firstChild) {
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

export function nextNotTextNodeSibling(el) {
    var nextSibling;
    while ((nextSibling = el.nextSibling)) {
        if (nextSibling.nodeType != TEXT_NODE) {
            return nextSibling;
        }
    }
    return null;
}

style('sn-display', `.sn-display { opacity: 1; -webkit-transition: opacity 300ms ease-out 0ms; transition: opacity 300ms ease-out 0ms; }
.sn-display-show { opacity: 1; }
.sn-display-hide { opacity: 0; }`);

export function fade(el, val) {
    var $el = $(el);
    var isInitDisplay = true;
    if (!$el.hasClass('sn-display')) {
        isInitDisplay = false;
        reflow($el.addClass('sn-display'));
    }
    var display = isNo(val) ? 'none' : val == 'block' || val == 'inline' || val == 'inline-block' ? val : '';
    if (display == 'none') {
        if (!$el.hasClass('sn-display-hide')) {
            var onHide = function () {
                if ($el.hasClass('sn-display-hide'))
                    $el.hide();
            };
            $el.addClass('sn-display-hide')
                .one(TRANSITION_END, onHide);
            setTimeout(onHide, 300);
        }
    } else if (!isInitDisplay || $el.hasClass('sn-display-hide')) {
        $el.css({
            display: display
        });
        reflow($el)
            .removeClass('sn-display-hide');
    }
}

export function isScrollToBottom(scrollElement) {
    if (!scrollElement) return false;
    var overflowY = getComputedStyle(scrollElement)['overflow-y'];
    if (overflowY !== 'auto' && overflowY !== 'scroll') {
        return (document.documentElement.scrollTop || document.body.scrollTop) + window.innerHeight >= scrollElement.scrollHeight - 50;
    }
    return scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 50;
}

export function isElementVisible(el) {
    const style = getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity < 0.1) return false;

    const rect = el.getBoundingClientRect();
    if (el.offsetWidth + el.offsetHeight + rect.height + rect.width === 0) {
        return false;
    }

    const vWidth = window.innerWidth || document.documentElement.clientWidth,
        vHeight = window.innerHeight || document.documentElement.clientHeight;
    // Return false if it's not in the viewport
    if (rect.right < 0 || rect.bottom < 0
        || rect.left > vWidth || rect.top > vHeight)
        return false;

    const efp = function (x, y) { return document.elementFromPoint(x, y); };
    // Return true if any of its four corners are visible
    return (
        el.contains(efp(rect.left, rect.top))
        || el.contains(efp(rect.right, rect.top))
        || el.contains(efp(rect.right, rect.bottom))
        || el.contains(efp(rect.left, rect.bottom))
    );
}

export { $ };
