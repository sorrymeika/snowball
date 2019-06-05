import { compile } from "./compile";
import { createElement, syncRootChildElements } from "./element";
import { render } from "./render";
import { $ } from "../../utils";

const factories = {};

export function createComponent(tagName) {
    return new factories[tagName]();
}

export function component({
    selector,
    template
}) {
    const rootVNode = compile(template);

    return (State) => {
        State.prototype.render = function () {
            const data = Object.create(this.state.data);
            data.__state = this;
            render(this.state.rootElement, this, data);
            this.state.rendered = true;
        };

        const componentClass = class Component {
            constructor(data) {
                this.state = new State(data);
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
            }

            render() {
                this.state.render();
            }
        };
        factories[selector] = componentClass;
    };
}