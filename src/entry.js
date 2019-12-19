
import React from 'react';
import ReactDOM from 'react-dom';
import App from './AppTest';
import * as serviceWorker from './serviceWorker';

// import { ViewModel } from './vm';

// const vm = new ViewModel({
//     el: `<ul>
//     <li sn-repeat="item,i in data">{i}:{item.id}:{item.name}</li>
//     </ul>`,
//     attributes: {
//         data: [{
//             id: 1,
//             name: 'name'
//         }]
//     }
// });

// vm.appendTo(document.getElementById('root'));

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
