import React from 'react';
import { Model } from '../../vm';
import { PageContext } from '../lib/ReactViewHandler';

export default function provide(mapPropsToStore) {
    return (componentClass) => {
        const factory = React.createFactory(componentClass);

        class Provider extends React.Component {
            static contextType = PageContext

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
                    <PageContext.Provider
                        value={{
                            ...this.context,
                            store: this.store
                        }}
                    >{factory({ ...this.state.attributes, ...this.props })}</PageContext.Provider>
                );
            }
        }

        return Provider;
    };
}