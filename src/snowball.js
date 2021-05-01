import _React from 'react';
import _ReactDOM from 'react-dom';
import * as _app from './app';
import * as _components from './components';
import * as _graphics from './graphics';
import * as _widget from './widget';
import * as util from './utils';
import * as env from './env';

export const $ = util.$;
export const resource = _app.resource;

export {
    env,
    util,
    _React,
    _ReactDOM,
    _app,
    _components,
    _graphics,
    _widget,
};

export * from "./vm";
export * from "./core/event";
