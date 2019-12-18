import { ViewModel } from './vm';

// import React from 'react';
// import ReactDOM from 'react-dom';
// import App from './AppTest';
import * as serviceWorker from './serviceWorker';

let now = performance.now();

let a = {
    name: 1,
    name1: 10,
    name2: 10,
    name3: 10,
    name4: 10,
    name5: 10,
    name6: 10,
    name7: 10,
    name8: 10,
};

for (let i = 0; i < 1000000; i++) {
    Object.assign({}, {
        name: 1,
        name1: 10,
        name2: 10,
        name3: 10,
        name4: 10,
        name5: 10,
        name6: 10,
        name7: 10,
        name8: 10,
    });
}

console.log(performance.now() - now);

now = performance.now();

for (let i = 0; i < 1000000; i++) {
    var b = Object.create({
        name: 1,
        name1: 10,
        name2: 10,
        name3: 10,
        name4: 10,
        name5: 10,
        name6: 10,
        name7: 10,
        name8: 10,
    });
}

console.log(performance.now() - now);


const vm = new ViewModel({
    el: `<ul>
    <li sn-repeat="item,i in data">{i}:{item.id}:{item.name}</li>
    </ul>`,
    attributes: {
        data: [{
            id: 1,
            name: 'name'
        }]
    }
});

vm.appendTo(document.getElementById('root'));

// ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
