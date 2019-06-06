import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './App.css';
import { ViewModel, component, Model } from './vm';

@component({
    tagName: 'Test',
    template: `<ul>
    <li sn-repeat="item,i in data">{i},{item.name}</li>
    </ul>`
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
            a: ',,,',
            data: [{
                name: 1
            }]
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
