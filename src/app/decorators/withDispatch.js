import { createFactory, Component } from 'react';
import AnyPropType from '../AnyPropType';

export default function withDispatch(type) {
    const wrapper = (BaseComponent) => {
        const factory = createFactory(BaseComponent);

        class WithNotifyEvent extends Component {
            static contextTypes = {
                __postMessage: AnyPropType
            };

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
