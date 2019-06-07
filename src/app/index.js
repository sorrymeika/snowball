/**
 * 功能: 单页应用
 * 作者: sunlu
 */

import * as navigation from './navigation';

/**
 * 导航方法
 */
export { navigation };

export * from './lib/backEventHandlers';
export { default as createPage } from './lib/createPage';
export { createApplication } from './lib/createApplication';
export { registerRoutes } from './lib/registerRoutes';
