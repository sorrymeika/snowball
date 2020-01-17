import { compile } from "./compile";
import { createElement, syncRootChildElements, removeElement } from "./element";
import { render, invokeEvent } from "./render";
import { $, isFunction } from "../../utils";
import { nextTick } from "../methods/enqueueUpdate";

const factories = {};

export function createComponent(tagName, props, rootComponent) {
    return new factories[tagName](props);
}

export function isComponent(instance) {
    return instance instanceof Component;
}

function nodeHandler(element, action) {
    const { rootElement } = this;
    const handle = () => {
        $(rootElement.firstChild)[action](element);
        syncRootChildElements(rootElement);
    };

    rootElement.firstChild
        ? handle()
        : nextTick(handle);

    return this;
}

class Component {
    constructor(state, rootVNode, ownComponent) {
        this.state = state;
        state.state.component = this;

        this.ownComponent = ownComponent || this;
        this._eventsDelegation = {};
        this.refs = {};

        const rootElement = this.rootElement = createElement(rootVNode);
        rootElement.component = this;
        rootElement.id = this.state.state.id;
        rootElement.components = [];

        this.state.on('destroy', () => {
            this.remove();
            this.rootElement.components.forEach((item) => {
                item.destroy();
            });
        });
    }

    _delegateEvents() {
        const { rootElement } = this;
        const events = Object.keys(this._eventsDelegation);

        if (events.length) {
            const nodes = [];

            rootElement.childElements.forEach((elem) => {
                if (elem.vnode.type == 'node') {
                    nodes.push(elem.node);
                }
            });

            const eventFxMap = {
                'transitionend': $.fx.transitionEnd,
                'animationend': $.fx.animationEnd,
            };

            events.forEach((eventName) => {
                nodes.forEach((el) => {
                    if (!(el.boundEvents || (el.boundEvents = {}))[eventName]) {
                        el.boundEvents[eventName] = true;
                        const eventId = 'sn' + this.state.state.id + '-on' + eventName;
                        const eventSelector = '[' + eventId + ']';
                        const handleEvent = (e) => {
                            invokeEvent(e.currentTarget.vElement, e.currentTarget.vElement.data, Number(e.currentTarget.getAttribute(eventId)), e);
                        };
                        const fxEventName = eventFxMap[eventName] || eventName;

                        $(el).on(fxEventName, eventSelector, handleEvent)
                            .filter(eventSelector)
                            .on(fxEventName, handleEvent);
                    }
                });
            });
        }

        if (this.ownComponent !== this && !this.ownComponent._rendering) {
            this.ownComponent._delegateEvents();
        }
    }

    appendTo(element) {
        return nodeHandler.call(this, element, 'appendTo');
    }

    prependTo(element) {
        return nodeHandler.call(this, element, 'prependTo');
    }

    before(element) {
        return nodeHandler.call(this, element, 'before');
    }

    after(element) {
        return nodeHandler.call(this, element, 'after');
    }

    insertAfter(element) {
        return nodeHandler.call(this, element, 'insertAfter');
    }

    insertBefore(element) {
        return nodeHandler.call(this, element, 'insertBefore');
    }

    remove() {
        const { rootElement } = this;
        const handle = () => {
            $(rootElement.firstChild).remove();
            const childElements = rootElement.childElements;
            if (childElements) {
                for (let i = 0; i < childElements.length; i++) {
                    removeElement(childElements[i]);
                }
            }
        };

        rootElement.firstChild
            ? handle()
            : nextTick(handle);

        return this;
    }

    set(data) {
        this.state.set(data);
        return this;
    }

    destroy() {
        this.state.destroy();
    }

    render() {
        this.state.render();
        return this;
    }
}

function componentRender() {
    const data = Object.create(this.state.data || null);
    data.$state = this;

    const componentInstance = this.state.component;
    componentInstance.refs = {};
    componentInstance._eventsDelegation = {};
    componentInstance._rendering = true;

    render(componentInstance.rootElement, this, data);

    componentInstance._rendering = false;
    componentInstance._delegateEvents();
    this.state.renderedVersion = this.state.version;

    return componentInstance;
}

export function template(templateStr) {
    const rootVNode = compile(templateStr);
    return (state) => {
        state.render = componentRender;
        return new Component(state, rootVNode);
    };
}

export function component({
    tagName,
    template
}) {
    const rootVNode = compile(template);

    return (State) => {
        State.prototype.render = componentRender;

        if (isFunction(State.prototype.initialize)) {
            const set = State.prototype.set;
            State.prototype.set = function (data) {
                this.set = set;
                this.initialize(data);
            };
        }

        const componentFactory = function (data, rootComponent) {
            const state = new State(data);
            return new Component(state, rootVNode, rootComponent);
        };

        if (tagName) {
            if (factories[tagName]) {
                throw new Error('`' + tagName + '` is already registered!');
            }
            factories[tagName] = componentFactory;
        }

        return componentFactory;
    };
}

if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
        const { observable } = require("../observable");

        const data = observable({
            name: 1
        });
        const connect = template(`<div>{name}</div>`);
        const item = connect(data);

        const div = document.createElement('div');

        item.render();
        item.appendTo(div);

        console.assert(div.querySelector('div').innerHTML == 1, "html error:" + div.innerHTML);

        data.set({ name: 2 })
            .nextTick(() => {
                console.assert(div.querySelector('div').innerHTML == 2, "html error:" + div.innerHTML);
            });
    });
}