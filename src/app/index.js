/**
 * 功能: 单页应用
 * 作者: sunlu
 */
import * as resource from './core/resource';
export { createApplication } from './core/createApplication';
export { registerRoutes } from './core/registerRoutes';
export { resource };
export * from './core/backEventHandlers';

export { controller } from './controller/controller';
export { Service } from './controller/Service';
export { injectable } from './controller/injectable';
export { inject } from './react/inject';
export { observer } from './react/observer';
export { ref } from './react/ref';
export { provide } from './react/provide';
