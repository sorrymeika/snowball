const ua = navigator.userAgent;

export const PLATFORM = /(Android);?[\s/]+([\d.]+)?/i.test(ua)
    ? "android"
    : /(iPhone|iPad|iPod).*OS\s([\d_]+)/i.test(ua)
        ? 'iOS'
        : /(MSIE) (\d+)/i.test(ua)
            ? 'ie'
            : /Chrome\/(\d+)/i.test(ua)
                ? 'chrome'
                : 'unknow';

const ov = RegExp.$2 ? RegExp.$2.split(/_|\./) : [0, 0];

export const iOS = PLATFORM === 'iOS';
export const android = PLATFORM === 'android';
export const osVersion = parseFloat(ov[0] + '.' + ov[1]);

export const IS_SNOWBALL_WEBVIEW = /snowball/i.test(ua);
