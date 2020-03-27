/**
 * 功能: 单页应用
 * 作者: sunlu
 */
import * as resource from './core/resource';
import { Page as _P } from './core/Page';

import './react/ReactViewAdapter';

export { createApplication, appCtx as app } from './core/createApplication';
export { renderActivity } from './core/ActivityManager';
export { registerRoutes } from './core/registerRoutes';
export { default as lazy } from './core/lazy';
export { resource };
export const Page = { extentions: _P.extentions };
export * from './core/backEventHandlers';

export { configuration } from './core/configuration';
export { autowired, param } from './core/autowired';
export { controller } from './controller/controller';
export { emitter, asyncEmitter } from './controller/emitter';
export { singleton } from './controller/singleton';
export { Service } from './controller/Service';
export { ViewModel } from './controller/ViewModel';
export { default as Module } from './controller/Module';

export { inject, PageContext, AppContextProvider } from './react/inject';
export { observer } from './react/observer';
export { reactModule } from './react/reactModule';
export { ref } from './react/ref';
export { default as mapViewModelToProps } from './react/mapViewModelToProps';
