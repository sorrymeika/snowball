import { sdk } from './sdk';

import * as webview from './webview';
import * as GIS from './GIS';

import ShareTypes from './share/ShareTypes';
import ShareContentTypes from './share/ShareContentTypes';

export {
    sdk,
    GIS
};

export const pay = (paycode) => sdk.execute('pay', paycode);

export const exitWebView = webview.exit;
export const openWebView = webview.open;

export * from './share';
export { ShareContentTypes, ShareTypes };

