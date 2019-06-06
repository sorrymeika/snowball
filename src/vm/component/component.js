import { compile } from "./compile";
import { createElement, syncRootChildElements } from "./element";
import { render } from "./render";
import { $, isFunction } from "../../utils";

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
            render(this.state.rootElement, this, data);
            this.state.rendered = true;
            return this.state.component;
        };

        if (isFunction(State.prototype.initialize)) {
            const set = State.prototype.set;
            State.prototype.set = function (data) {
                this.initialize(data);
                this.set = set;
            };
        }


        const componentClass = class Component {
            constructor(data) {
                this.state = new State(data);
                this.state.state.component = this;
                this.element = this.state.state.rootElement = createElement(rootVNode);
            }

            appendTo(element) {
                $(this.element.firstChild).appendTo(element);
                syncRootChildElements(this.element);
            }

            prependTo(element) {
                $(this.element.firstChild).prependTo(element);
                syncRootChildElements(this.element);
            }

            before(element) {
                $(this.element.firstChild).before(element);
                syncRootChildElements(this.element);
            }

            after(element) {
                $(this.element.firstChild).after(element);
                syncRootChildElements(this.element);
            }

            insertAfter(element) {
                $(this.element.firstChild).insertAfter(element);
                syncRootChildElements(this.element);
            }

            insertBefore(element) {
                $(this.element.firstChild).insertBefore(element);
                syncRootChildElements(this.element);
            }

            set(data) {
                this.state.set(data);
                return this;
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