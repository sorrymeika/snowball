import { sdk } from "./sdk";

// 打开新webview
export async function open(url) {
    console.log('%copenWebView:', 'background:green;color:#fff;', url);
    sdk.execute('openWebView', url);
}

// 关闭当前webview
export function exit() {
    sdk.execute('exitWebView');
}
