import { TEXT_NODE, ELEMENT_NODE } from '../../utils/dom';
import { camelCase } from '../../utils/string';
import { ViewModel } from '../ViewModel';

const registedComponents = {};

function extendViewModel(options) {
    class Component extends ViewModel {
    }
    Object.assign(Component.prototype, options);
    return Component;
}

export function registerComponent(componentName, component) {
    registedComponents[componentName] = typeof component == 'function'
        ? component
        : extendViewModel(component);
}

export class ComponentCompiler {
    constructor(template) {
        this.template = template;
        this.viewModel = template.viewModel;
    }

    compile(node, nodeType) {
        if (nodeType == ELEMENT_NODE) {
            var propsVal;
            var componentName;
            var nodeName = node.nodeName;

            if (nodeName.slice(0, 3) === 'SN-') {
                componentName = camelCase(nodeName.slice(3).toLowerCase());
                propsVal = node.getAttribute('props');
                node.removeAttribute('props');
            } else if ((componentName = node.getAttribute('sn-component'))) {
                propsVal = node.getAttribute('sn-props');
                node.removeAttribute('sn-component');
                node.removeAttribute('sn-props');
            }
            if (componentName) {
                node.snComponent = registedComponents[componentName] || (
                    typeof this.viewModel.components == 'function'
                        ? this.viewModel.components(componentName)
                        : this.viewModel.components[componentName]
                );
                node.snProps = this.template.compileToFunction(propsVal);
            }
        }
    }

    update(nodeData) {
        var viewModel = this.viewModel;
        var el = nodeData.node;
        var fid = el.snProps;
        var props = !fid ? null : this.template.executeFunction(fid, nodeData.data);
        var instance = el.snComponentInstance;

        if (instance) {
            instance.set(props);
            nodeData.setRef(instance);
        } else if (el.snComponent) {
            var children = [];
            var Component = el.snComponent;
            var node = el.firstChild;

            while (node) {
                if (node.nodeType !== TEXT_NODE || !/^\s*$/.test(node.nodeValue)) {
                    children.push(node);
                    node.snViewModel = viewModel;
                    viewModel.$el.push(node);
                }
                node = node.nextSibling;
            }

            instance = new Component(Component.isTemplateComponent
                ? {
                    attributes: props
                }
                : props, children);
            instance.$el.appendTo(el);

            el.snComponentInstance = instance;
            delete el.snComponent;

            nodeData.setRef(instance);
        }
    }
}
