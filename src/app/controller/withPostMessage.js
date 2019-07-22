import { createFactory, Component } from 'react';
import { PageProviderContext } from '../core/ReactViewHandler';

export function withPostMessage(type) {
    const wrapper = (BaseComponent) => {
        const factory = createFactory(BaseComponent);

        class WithPostMessage extends Component {
            static contextType = PageProviderContext;

            constructor(props, context) {
                super(props, context);
                const postMessage = context.__postMessage;
                this.postMessage = (event) => {
                    postMessage && postMessage(event);
                };
            }

            render() {
                return factory({ postMessage: this.postMessage, ...this.props });
            }
        }

        return WithPostMessage;
    };
    if (typeof type === 'function') {
        return wrapper(type);
    }
    return wrapper;
}
