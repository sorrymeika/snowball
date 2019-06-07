import * as util from "./index";

export function jsonp(url, params) {
    return new Promise((resolve, reject) => {
        window.jsonP = window.jsonP || {};
        const callbackId = window.jsonP.callbackId = window.jsonP.callbackId ? ++window.jsonP.callbackId : 1;
        // 存储回调的数据
        let content;
        const callbackName = `callback_${callbackId}`;
        window.jsonP[callbackName] = (data) => {
            content = data;
        };
        const data = Object.assign({}, params, { callback: `jsonP.${callbackName}` });
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url + util.params(data);
        script.async = true;
        const removeScript = (e) => {
            document.body.removeChild(script);
            delete window.jsonP[callbackName];
            if (e.type === 'load') {
                resolve(content);
            } else {
                reject('error');
            }
        };
        script.addEventListener('load', removeScript, false);
        script.addEventListener('error', removeScript, false);
        document.body.appendChild(script);
    });
}