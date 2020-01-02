/**
 * 功能: 单页应用
 * 作者: sunlu
 */
import * as resource from './core/resource';
import { Page as _P } from './core/Page';

export { createApplication, ctx as app } from './core/createApplication';
export { registerRoutes } from './core/registerRoutes';
export { default as lazy } from './core/lazy';
export { resource };
export const Page = { extentions: _P.extentions };
export * from './core/backEventHandlers';

export { controller } from './controller/controller';
export { configuration } from './controller/configuration';
export { autowired, param } from './controller/autowired';
export { singleton } from './controller/singleton';
export { Service } from './controller/Service';

export { inject, PageContext } from './react/inject';
export { observer } from './react/observer';
export { ref } from './react/ref';

export function injectable() {
    throw new Error('`injectable` is deprecated');
}
