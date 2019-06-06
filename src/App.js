import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './App.css';
import { ViewModel, component, Model } from './vm';

@component({
    tagName: 'Test',
    template: `<div>234{a}
    <span>bb<span>aa</span>b</span>
    </div>`
})
class Test extends Model {
}


class App extends Component {

    componentDidMount() {
        const root = ReactDOM.findDOMNode(this);

        const viewModel = new ViewModel({
            el: `<div>{name}</div>`,
            attributes: {
                name: 'xxx'
            }
        });
        viewModel.appendTo(root);

        const test = new Test({
            a: ',,,'
        });
        test.appendTo(root);
        console.log(test);
    }

    render() {
        return (
            <div className="App">
            </div>
        );
    }
}

export default App;
