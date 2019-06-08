import {
    sdk
} from './sdk';
import { login, addOnBeforeLoginListener, removeOnBeforeLoginListener } from './user';

import * as webview from './webview';
import * as GIS from './GIS';

import ShareTypes from './share/ShareTypes';
import ShareContentTypes from './share/ShareContentTypes';

export {
    sdk,
    addOnBeforeLoginListener,
    removeOnBeforeLoginListener,
    login,
    GIS
};

export const preventBack = () => sdk.execute('preventBack');
export const releaseBack = () => sdk.execute('releaseBack');
export const saveGlobalAddress = (address) => sdk.execute('saveGlobalAddress', address);
export const sxLog = (content) => sdk.execute('sxLog', content);
export const pay = (paycode) => sdk.execute('pay', paycode);
export const getAppVersion = () => new Promise(resolve => sdk.execute('getAppVersion', resolve) || resolve());

export const exitWebView = webview.exit;
export const openWebView = webview.open;

export * from './share';
export { ShareContentTypes, ShareTypes };

