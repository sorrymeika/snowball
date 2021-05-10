import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { component, Model, observable, autorun, $, customComponent } from './snowball';

import './sass/app.scss';

@customComponent('Custom')
export class Custom {
    constructor() {
        this.el = $('<div>Custom Component</div>');
    }

    set() {
    }

    render() {
    }
}

@component({
    tagName: 'Test',
    template: `
    test:
    <ul onclick={a=Date.now(),console.log($event)}>
    {a}
    <li sn-repeat="item,i in data">a:{i},{item.name}</li>
    </ul>
    <ul sn-if={Date.now()%2}>
        <li sn-repeat="item,i in data">b:{i},{item.name}</li>
    </ul>
    <Test1 data={data} />
    <Custom />
    <Slider loop data={data} />
    `
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
        const test = new Test({
            a: ',,,',
            data: [{
                name: 1
            }, {
                name: 'tt'
            }]
        });
        test.appendTo(root);

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
