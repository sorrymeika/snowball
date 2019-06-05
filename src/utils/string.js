export function camelCase(str) {
    return str.replace(/-+(.)?/g, function (match, chr) {
        return chr ? chr.toUpperCase() : '';
    });
}

/**
 * 判断是否有非法字符
 *
 * @export
 * @param {any} str 待检测的字符串
 * @returns
 */
export function isLegal(str, illegalStr) {
    if (!str || Object.prototype.toString.call(str) != '[object String]') {
        return false;
    }
    const ILLEGAL_STRING = illegalStr || `#_%&'/",;:=!^`;
    for (let s of ILLEGAL_STRING) {
        if (str.includes(s)) {
            return false;
        }
    }
    return true;
}

/**
 * 判断字符串内是否包含emoji
 *
 * @param {any} str
 * @returns
 */
export function hasEmoji(str) {
    for (let i = 0; i < str.length; i++) {
        let hs = str.charCodeAt(i);
        let ls = '';
        if (0xd800 <= hs && hs <= 0xdbff) {
            if (str.length > 1) {
                ls = str.charCodeAt(i + 1);
                var uc = (hs - 0xd800) * 0x400 + (ls - 0xdc00) + 0x10000;
                if (0x1d000 <= uc && uc <= 0x1f77f) {
                    return true;
                }
            }
        } else if (str.length > 1) {
            ls = str.charCodeAt(i + 1);
            if (ls == 0x20e3) {
                return true;
            }
        } else {
            if (0x2100 <= hs && hs <= 0x27ff) {
                return true;
            } else if (0x2b05 <= hs && hs <= 0x2b07) {
                return true;
            } else if (0x2934 <= hs && hs <= 0x2935) {
                return true;
            } else if (0x3297 <= hs && hs <= 0x3299) {
                return true;
            } else if (
                hs == 0xa9 ||
                hs == 0xae ||
                hs == 0x303d ||
                hs == 0x3030 ||
                hs == 0x2b55 ||
                hs == 0x2b1c ||
                hs == 0x2b1b ||
                hs == 0x2b50
            ) {
                return true;
            }
        }
    }
    return false;
}

// 下面是64个基本的编码
var base64EncodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// 编码的方法
export function base64(str) {
    if (typeof str !== 'string') str += '';
    var out, i, len;
    var c1, c2, c3;
    len = str.length;
    i = 0;
    out = '';
    while (i < len) {
        c1 = str.charCodeAt(i++) & 0xff;
        if (i == len) {
            out += base64EncodeChars.charAt(c1 >> 2);
            out += base64EncodeChars.charAt((c1 & 0x3) << 4);
            out += '==';
            break;
        }
        c2 = str.charCodeAt(i++);
        if (i == len) {
            out += base64EncodeChars.charAt(c1 >> 2);
            out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
            out += base64EncodeChars.charAt((c2 & 0xf) << 2);
            out += '=';
            break;
        }
        c3 = str.charCodeAt(i++);
        out += base64EncodeChars.charAt(c1 >> 2);
        out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
        out += base64EncodeChars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
        out += base64EncodeChars.charAt(c3 & 0x3f);
    }
    return out;
}
