/**
 * 功能: 单页应用
 * 作者: sunlu
 */

import * as navigation from './navigation';

/**
 * 导航方法
 */
export { navigation };

export { createApplication } from './core/createApplication';
export { registerRoutes } from './core/registerRoutes';
export * from './core/backEventHandlers';

export { controller } from './controller/controller';
export { Service } from './controller/Service';
export { injectable } from './controller/injectable';
export { inject } from './controller/inject';
export { observer } from './controller/observer';
export { onMessage } from './controller/onMessage';
export { withPostMessage } from './controller/withPostMessage';
export { ref } from './controller/ref';
export { provide } from './controller/provide';
