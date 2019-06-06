import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './App.css';
import { ViewModel, component, Model } from './vm';

@component({
    tagName: 'Test',
    template: `
    
    <ul @click={a=1}>
    {a}
    <li sn-repeat="item,i in data">a:{i},{item.name}</li>
    </ul>
    <Test1 data={data} />`
})
class Test extends Model {
}

component({
    tagName: 'Test1',
    template: `<div>asfd:{data.length}
    <ul>
    <li sn-repeat="item,i in data">{i},{item.name}</li>
    </ul>
    </div>`
})(class extends Model {
});

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
            }, {
                name: 'tt'
            }]
        });
        test.appendTo(root);
        console.log(test);

        setTimeout(() => {
            // test.destroy();
        }, 1000);
    }

    render() {
        return (
            <div className="App">
            </div>
        );
    }
}

export default App;
