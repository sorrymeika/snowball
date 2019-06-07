import React from 'react';
import { Model } from '../../vm';
import AnyPropType from '../AnyPropType';

export default function provide(mapPropsToStore) {
    return (componentClass) => {
        const factory = React.createFactory(componentClass);

        class Provider extends React.Component {
            static contextTypes = {
                store: AnyPropType
            };

            static childContextTypes = {
                store: AnyPropType
            }

            getChildContext() {
                return { store: this.store };
            }

            constructor(props, context) {
                super(props, context);

                const stores = mapPropsToStore(props);
                var model = new Model(stores);
                model.observe(() => {
                    if (this.state.attributes !== model.attributes) {
                        Object.assign(this.store, this.model.attributes);
                        this.setState({
                            attributes: model.attributes
                        });
                    }
                });

                this.model = model;
                this.setupStore(context, model);

                this.state = {
                    attributes: this.model.attributes
                };
            }

            componentWillReceiveProps(nextProps, nextContext) {
                if (nextContext.store != this.context.store) {
                    this.setupStore(nextContext, this.model);
                }
            }

            setupStore(context, model) {
                this.store = Object.assign(Object.create(context.store || {}), model.attributes);
            }

            render() {
                return factory({ ...this.state.attributes, ...this.props });
            }
        }

        return Provider;
    };
}