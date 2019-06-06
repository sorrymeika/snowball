import { compile } from "./compile";
import { createElement, syncRootChildElements, removeElement } from "./element";
import { render } from "./render";
import { $, isFunction } from "../../utils";
import { nextTick } from "../methods/enqueueUpdate";

const factories = {};

export function createComponent(tagName) {
    return new factories[tagName]();
}

export function component({
    tagName,
    template
}) {
    const rootVNode = compile(template);

    return (State) => {
        State.prototype.render = function () {
            const data = Object.create(this.state.data || null);
            data.__state = this;
            render(this.state.component.rootElement, this, data);
            this.state.renderedVersion = this.state.version;
            return this.state.component;
        };

        if (isFunction(State.prototype.initialize)) {
            const set = State.prototype.set;
            State.prototype.set = function (data) {
                this.set = set;
                this.initialize(data);
            };
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

        const componentClass = class Component {
            constructor(data) {
                this.state = new State(data);
                this.state.state.component = this;
                this.rootElement = createElement(rootVNode);
                this.rootElement.components = [];

                this.state.on('destroy', () => {
                    this.remove();
                    this.rootElement.components.forEach((item) => {
                        item.destroy();
                    });
                });
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
        };

        if (tagName) {
            if (factories[tagName]) {
                throw new Error('`' + tagName + '` is already registered!');
            }
            factories[tagName] = componentClass;
        }

        return componentClass;
    };
}