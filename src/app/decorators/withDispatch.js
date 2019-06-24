import { createFactory, Component } from 'react';
import { PageContext } from '../lib/ReactViewHandler';

export default function withDispatch(type) {
    const wrapper = (BaseComponent) => {
        const factory = createFactory(BaseComponent);

        class WithNotifyEvent extends Component {
            static contextType = PageContext;

            constructor(props, context) {
                super(props, context);
                const dispatch = context.__postMessage;
                this.dispatch = (event) => {
                    dispatch && dispatch(event);
                };
            }

            render() {
                return factory({ dispatch: this.dispatch, ...this.props });
            }
        }

        return WithNotifyEvent;
    };
    if (typeof type === 'function') {
        return wrapper(type);
    }
    return wrapper;
}
