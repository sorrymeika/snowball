import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './App.css';
import { ViewModel } from './vm';


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
    }

    render() {
        return (
            <div className="App">
            </div>
        );
    }
}

export default App;
