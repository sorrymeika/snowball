import { IS_SNOWBALL_WEBVIEW } from "../../../env";
import parseShareData from "../parseShareData";


export class SnowballWebView {
    constructor(callNativeSDK) {
        this.callNativeSDK = callNativeSDK;
    }

    callSdk(success, error, data) {
        if (IS_SNOWBALL_WEBVIEW) {
            this.callNativeSDK(success, error, data);
            return true;
        }
        return false;
    }

    login(url, success, error) {
        return this.callSdk(success, error, {
            action: 1,
            type: 2,
            data: {},
            source: 2
        });
    }

    getLocation(callback, error) {
        return this.callSdk(callback, error, {
            action: 4,
            type: 1
        });
    }

    prepareShareData(data) {
        // 配置分享数据和方式
        let opt = {
            action: 8,
            type: 7,
            data: parseShareData(data)
        };
        return this.callSdk(null, null, opt);
    }

    showShareView() {
        return this.callSdk(null, null, {
            action: 8,
            type: 5
        });
    }

    openWebView(url) {
        return this.callSdk(null, null, {
            action: 8,
            type: 3,
            source: 2,
            data: {
                url,
                needWebToken: 'YES'
            }
        });
    }

    exitWebView() {
        return this.callSdk(null, null, {
            action: 8,
            type: 2
        });
    }
}

export default SnowballWebView;