import { isYes, isNumber } from '../../utils/is';
import { createComponent } from './component';
import { Reaction } from '../Reaction';
import { get } from '../../utils';
import { isModel, isCollection } from '../predicates';
import { ObserverList } from '../List';
import {
    IElement,
    createElement,
    removeElement,
    prependElement,
    insertElementAfter,
    setAttribute
} from './element';

export function render(element: IElement, state, data) {
    const { vnode } = element;

    if (vnode.visibleProps && vnode.visibleProps.type == 'if') {
        let visible = invoke(element, data, vnode.visibleProps.fid);
        if (isYes(visible)) {
            for (let i = 0; i < element.elses.length; i++) {
                removeElement(element.elses[i]);
            }
        } else {
            removeElement(element);
            for (let i = 0; i < element.elses.length; i++) {
                let el = element.elses[i];
                if (visible) {
                    removeElement(el);
                } else if (el.vnode.visibleProps.type == 'else') {
                    return render(el, state, data);
                } else {
                    visible = invoke(el, data, el.vnode.visibleProps.fid);
                    if (visible) {
                        return render(el, state, data);
                    }
                }
            }
            return;
        }
    }

    if (vnode.repeatProps && element.type !== 'repeat-item') {
        return renderRepeat(element);
    }

    const isComponent = vnode.type === 'component';
    if (isComponent) {
        if (!element.component) {
            element.component = createComponent(vnode.tagName);
            element.root.components.push(element.component);
        }
    } else if (!element.node) {
        if (vnode.type === 'root') {
            element.node = document.createDocumentFragment();
            element.firstChild = document.createComment('component');
            element.node.appendChild(element.firstChild);
        } else if (vnode.type === 'textNode') {
            element.node = document.createTextNode(vnode.nodeValue || '');
        } else {
            const nodeName = vnode.tagName;
            const node = vnode.isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);

            element.node = node;

            const attributes = vnode.attributes;
            if (attributes) {
                for (let i = 0; i < attributes.length; i += 2) {
                    setAttribute(element, attributes[i], attributes[i + 1]);
                }
            }
        }
    }

    const events = vnode.events;
    if (events) {
        element.eventData = data;
        if (!element.bindEvent) {
            element.bindEvent = true;
            for (let i = 0; i < events.length; i += 2) {
                const fid = events[i + 1];
                element.node.addEventListener(events[i], () => {
                    return invoke(element, element.eventData, fid, $setter);
                });
            }
        }
    }

    const children = element.children;
    if (children) {
        let prevSibling;
        if (vnode.type === 'root') {
            prevSibling = element.firstChild;
        }
        element.childElements = [];
        for (let i = 0; i < children.length; i++) {
            const child = render(children[i], state, data);
            if (child) {
                if (!isComponent) {
                    if (!prevSibling) {
                        prependElement(element, child);
                    } else {
                        insertElementAfter(prevSibling, child);
                    }
                }
                if (child.isRepeat) {
                    renderRepeatItem(child, state, data);
                    prevSibling = child.closeNode;
                } else {
                    prevSibling = child;
                }
                element.childElements.push(child);
            }
        }
    }

    const props = vnode.props;
    if (props) {
        if (isComponent) {
            if (!element.reaction) {
                const autorun = () => {
                    const nextProps = {
                        children: element.childElements
                    };
                    for (let i = 0; i < props.length; i += 2) {
                        nextProps[props[i]] = invoke(element, data, props[i + 1]);
                    }
                    element.component.set(nextProps);
                    element.component.render();
                };
                element.reaction = new Reaction(autorun);
                element.autorun = autorun;
            }
            element.reaction.track(element.autorun);
        } else {
            let autoruns = element.autoruns;
            if (!autoruns) {
                element.autoruns = autoruns = [];
                for (let i = 0; i < props.length; i += 2) {
                    autoruns.push(autoSet(element, props[i], data, props[i + 1]));
                }
            }
            for (let i = 0; i < autoruns.length; i++) {
                autoruns[i].track(autoruns[i].__propAutoSet);
            }
        }
    }

    return element;
}

function renderRepeat(element: IElement) {
    const {
        value
    } = element.vnode.repeatProps;

    if (!element.node) {
        element.node = document.createComment('repeat start: ' + value);
        element.closeNode = document.createComment('repeat end: ' + value);
        element.isRepeat = true;
    }
    return element;
}

function renderRepeatItem(element: IElement, state, data) {
    const {
        dataSourcePath,
        alias,
        indexAlias,
        filter,
        orderByType,
        orderBy
    } = element.vnode.repeatProps;

    const dataSourceName = dataSourcePath[0];

    let collection;

    if (dataSourceName === 'this') {
        collection = get(state, dataSourcePath.slice(1));
    } else {
        const source = data[dataSourceName];
        let sourceState = source.__state;
        let paths;

        if (!sourceState) {
            sourceState = state;
            paths = dataSourcePath;
        } else {
            paths = dataSourcePath.slice(1);
        }

        collection = !paths
            ? source
            : isModel(sourceState)
                ? sourceState._(paths)
                : get(sourceState.state.data, paths);
    }

    if (!isCollection(collection)) {
        const array = collection;
        collection = element.collection || (element.collection = new ObserverList());
        collection.set(array);
    }

    const elements = element.elements || (element.elements = []);
    const visibleElements = {};
    const list = [];

    collection.each(function (item) {
        const elementData = Object.create(data);
        elementData[alias] = Object.create(item.state.data);
        elementData[alias].__state = item;

        if (filter == null || invoke(element, elementData, filter)) {
            let itemElement;

            for (let j = 0; j < elements.length; j++) {
                if (elements[j].state == item) {
                    visibleElements[j] = true;
                    itemElement = elements[j];
                    break;
                }
            }

            if (!itemElement) {
                const newItemElement = createElement(element.vnode, element.root);
                newItemElement.type = 'repeat-item';
                itemElement = {
                    element: newItemElement,
                    state: item
                };
                visibleElements[elements.length] = true;
                elements.push(itemElement);
            }

            list.push({
                element: itemElement.element,
                itemData: item.state.data,
                data: elementData
            });
        }
    });

    if (orderBy) {
        let sortMethod;
        if (orderByType === 'property') {
            sortMethod = get(state, orderBy);
        } else {
            // orderBy=['a',true,someFunctionId,false]
            const orderByOptions = orderBy.map(function (item) {
                if (isNumber(item)) {
                    return invoke(element, data, item);
                }
                return item;
            });

            sortMethod = function (am, bm) {
                let ret = 0,
                    isDesc,
                    sort,
                    a,
                    b;

                for (let i = 0; i < orderByOptions.length; i += 2) {
                    sort = orderByOptions[i];
                    isDesc = orderByOptions[i + 1] == false;

                    a = am[sort];
                    b = bm[sort];

                    // 中文排序需使用 localeCompare
                    ret = isNumber(a) && isNumber(b)
                        ? a - b
                        : ((a == null) ? '' : (a + '')).localeCompare(b);
                    isDesc && (ret *= -1);

                    if (ret != 0) return ret;
                }

                return ret;
            };
        }

        sortMethod && list.sort(function (a, b) {
            return sortMethod(a.itemData, b.itemData);
        });
    }

    let cursorElement = element.node;

    list.forEach(function (item, index) {
        const elem = item.element;

        indexAlias && (item.data[indexAlias] = index);
        render(elem, state, item.data);
        insertElementAfter(cursorElement, elem);

        cursorElement = elem;
    });

    insertElementAfter(cursorElement, element.closeNode);

    const refs = [];
    // 移除过滤掉的element
    for (let i = 0; i < elements.length; i++) {
        const elem = elements[i];
        if (!visibleElements[i]) {
            removeElement(elem);
        } else {
            refs.push(elem.node);
        }
    }

    return element;
}

function invoke(element, data, fid, arg1, arg2) {
    return element.root.vnode.fns[fid](data, arg1, arg2);
}

function autoSet(element, name, data, fid) {
    const autorun = () => setAttribute(element, name, invoke(element, data, fid));
    const reaction = new Reaction(autorun);
    reaction.__propAutoSet = autorun;
    return reaction;
}

function $setter(key, data) {
    return Object.create(null, {
        value: {
            set(val) {
                let source = data[key];

                if (source && source.__state) {
                    source.__state.set(val);
                } else {
                    data.__state.set({ [key]: val });
                }
            }
        }
    });
};