import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { ViewModel, component, Model, observable, autorun } from './snowball';

@component({
    tagName: 'Test',
    template: `
    test:
    <ul @click={a=Date.now(),console.log($event)}>
    {a}
    <li sn-repeat="item,i in data">a:{i},{item.name}</li>
    </ul>
    <ul sn-if={Date.now()%2}>
        <li sn-repeat="item,i in data">b:{i},{item.name}</li>
    </ul>
    <Test1 data={data} />`
})
class Test extends Model {
}

component({
    tagName: 'Test1',
    template: `test1:<div>asfd:{data.length}
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
class B {
    @observable.number
    id;
}

class A {
    @observable.number
    id;

    @observable
    b;
}

const a = new A();

a.b = new B();

autorun(() => {
    console.log('autorun', a.b.id, a);
});

console.log('set b');
a.b.id = 2;

setTimeout(() => {
    a.id = 3;
});

export default App;
