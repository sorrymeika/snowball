import {
    sdk,
    addTabResumeListener,
    addPajkMessageListener,
    removePajkMessageListener
} from './sdk';
import { login, treasureBox, renewToken, addOnBeforeLoginListener, removeOnBeforeLoginListener , queryMessageSettings } from './user';

import * as webview from './webview';
import * as GIS from './GIS';

import ShareTypes from './share/ShareTypes';
import ShareContentTypes from './share/ShareContentTypes';

export {
    sdk,
    addTabResumeListener,
    addPajkMessageListener,
    removePajkMessageListener,
    addOnBeforeLoginListener,
    removeOnBeforeLoginListener,
    login,
    treasureBox,
    renewToken,
    GIS,
    queryMessageSettings
};

export const preventBack = () => sdk.execute('preventBack');
export const releaseBack = () => sdk.execute('releaseBack');
export const saveGlobalAddress = (address) => sdk.execute('saveGlobalAddress', address);
export const sxLog = (content) => sdk.execute('sxLog', content);
export const pay = (paycode) => sdk.execute('pay', paycode);
export const getAppVersion = () => new Promise(resolve => sdk.execute('getAppVersion', resolve) || resolve());

export const exitWebView = webview.exit;
export const openWebView = webview.open;

export * from './share/index';
export { ShareContentTypes, ShareTypes };

