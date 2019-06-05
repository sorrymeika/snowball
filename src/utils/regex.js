

export function testRegExp(regExp, val) {
    return (regExp.lastIndex != 0 && (regExp.lastIndex = 0)) || regExp.test(val);
}

// var regExpRE = "\/(?:(?:\\{2})+|\\\/|[^\/\r\n])+\/[img]*(?=[\)|\.|,])"
// var RE_STRING = "'(?:(?:\\\\{2})+|\\\\'|[^'])*'|\"(?:(?:\\\\{2})+|\\\\\"|[^\"])*\"";
export const RE_STRING = "'(?:(?:\\\\{2})+|\\\\'|[^'])*'";

export function codeRegExp(exp, flags, deep) {
    if (typeof flags === 'number') {
        deep = flags;
        flags = undefined;
    } else if (!deep) deep = 6;

    var expArr = exp.split('...');
    if (expArr.length < 2) return new RegExp(exp, flags);

    var result = "";
    var lastIndex = expArr.length - 1;
    for (var i = 0; i <= lastIndex; i++) {
        if (i == lastIndex) {
            result += expArr[i].substr(1);
        } else {
            var pre = expArr[i].slice(-1);
            var suf = expArr[i + 1].charAt(0);
            var parenthesisREStart = '\\' + pre + '(?:' + RE_STRING + '|';
            var parenthesisREEnd = '[^\\' + suf + '])*\\' + suf;

            var before = "";
            var after = "";
            for (var j = 0; j <= deep; j++) {
                before += '(?:' + parenthesisREStart;
                after += parenthesisREEnd + ')|';
            }

            result += expArr[i].slice(0, -1) + parenthesisREStart + before + after + parenthesisREEnd;
        }
    }
    return new RegExp(result, flags);
}