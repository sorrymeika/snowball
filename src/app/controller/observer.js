import { Component } from "react";
import { Reaction } from "../../vm";

const ReactionProperty = Symbol('ReactionProperty');
const IsObserverComponent = Symbol('IsObserverComponent');

export function observer(componentClass) {
    if (!componentClass.prototype || !componentClass.prototype.render) {
        throw new Error('could\'t use `observer` to decorate stateless component! please use Hooks to instead!');
    }

    const target = componentClass.prototype;
    if (target[IsObserverComponent]) {
        return componentClass;
    }
    target[IsObserverComponent] = true;

    const baseComponentWillUnmount = target.componentWillUnmount;
    const baseRender = target.render;

    target.componentWillUnmount = function () {
        this[ReactionProperty] && this[ReactionProperty].destroy();
        baseComponentWillUnmount && baseComponentWillUnmount.call(this);
    };

    target.render = function () {
        let isRenderingPending = false;

        const reaction = new Reaction(() => {
            if (!isRenderingPending) {
                isRenderingPending = true;
                Component.prototype.forceUpdate.call(this);
            }
        }, true);

        function reactiveRender() {
            isRenderingPending = false;

            let root;
            reaction.track(() => {
                root = baseRender.call(this);
            });
            return root;
        }

        this[ReactionProperty] = reaction;
        this.render = reactiveRender;
        return reactiveRender.call(this);
    };
    return componentClass;
}