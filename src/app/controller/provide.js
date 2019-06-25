import React from 'react';
import { Model } from '../../vm';
import { PageProviderContext } from '../core/ReactViewHandler';

export function provide(mapPropsToStore) {
    return (componentClass) => {
        const factory = React.createFactory(componentClass);

        class Provider extends React.Component {
            static contextType = PageProviderContext

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

            render() {
                const { context } = this;
                if (this._store !== context.store) {
                    this._store = context.store;
                    this.store = Object.assign(Object.create(context.store || null), this.model.attributes);
                }
                return (
                    <PageProviderContext.Provider
                        value={{
                            ...this.context,
                            store: this.store
                        }}
                    >{factory({ ...this.state.attributes, ...this.props })}</PageProviderContext.Provider>
                );
            }
        }

        return Provider;
    };
}