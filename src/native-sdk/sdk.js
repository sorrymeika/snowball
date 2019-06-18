/**
 * Native调用JavaScript
 */

import * as env from "../../env";
import SnowballWebView from "./protocols/SnowballWebView";
import { WeiXin } from "./protocols/WeiXin";
import { Browser } from "./protocols/Browser";

const noop = () => { };

let callSdk;
if (env.IS_SNOWBALL_WEBVIEW) {
    callSdk = function (success, error, options) {
    };
} else {
    callSdk = noop;
}

function callNativeSDK(success, error, options) {
    callSdk(success, error, options);
}

class SDKCommand {
    commands: any[];

    constructor(commands) {
        this.commands = commands;
    }

    execute(action, data, callback, error) {
        for (var i = 0; i < this.commands.length; i++) {
            var command = this.commands[i];
            if (command[action] && command[action](data, callback, error)) {
                return true;
            }
        }
        return false;
    }
}

var cordova = new SnowballWebView(callNativeSDK);
var wx = new WeiXin();
var browser = new Browser();

export const sdk = new SDKCommand([cordova, wx, browser]);
export default sdk;

var onSnowballWebViewMessage = window.onSnowballWebViewMessage;
window.onSnowballWebViewMessage = function (options) {
    onSnowballWebViewMessage && onSnowballWebViewMessage(options);
};
