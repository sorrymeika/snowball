var matchPair = function (input, left, right, from) {
    var i = from || 0,
        len = input.length,
        count = 0,
        c,
        prev,
        quote,
        quoteCount = 0,
        res = '',
        start = false;

    while (i < len) {
        c = input.charAt(i);

        if (quoteCount == 0) {
            if (c == '"' || c == "'") {
                quote = c;
                quoteCount++;
            } else if (c == left && quoteCount == 0) {
                count++;

            } else if (c == right) {
                count--;
                if (count <= 0) {
                    break;
                }
            }
        } else if (c == quote) {
            quoteCount--;
        }

        if (count >= 1) {
            if (start) res += c;
            else start = true;
        }

        prev = c;
        i++;
    }
    return res;
};

function XRegExp(str) {
    this.str = str;

    str = str.split('...');

    this.parts = [];

    for (var i = 0, l = str.length - 1, item; i <= l; i++) {
        item = new RegExp(str[i], 'm');

        if (i != l) {
            item.left = left = str[i].charAt(str[i].length - 1);
            item.right = str[i + 1].charAt(str[i + 1].length - 1);
        }
        this.parts.push(item);
    }
}

XRegExp.prototype = {

    exec: function (input) {
        var result = [],
            start = 0,
            part = this.parts;

        result.input = input;
        result.match = '';

        for (var i = 0, n = part.length - 1, item, m; i <= n; i++) {
            item = part[i];

            m = item.exec(input);
            if (!m) return null;

            for (var j = 0, l = m.length; j < l; j++) {
                result.push(m[j]);
            }

            start = m.index + m[0].length;

            result.match += m[0];

            if (i == 0) {
                result.index = m.index;
            }

            if (i != n) {
                var res = matchPair(input, item.left, item.right, start - 1);

                result.match += res;
                result.push(res);

                input = input.substr(start + res.length);
            }
        }

        return result;
    }
}

var ruse = /(?:^|[^@])@use\s+('|")([^\r\n]+?)\1\s+as\s+([^\s;]+)(;{0,1})/mg;
var rcmd = /^(for|if|(function|helper)\s+([a-zA-Z_$][a-zA-Z_$1-9]*))\s*\(([^\)]*)\)\s*(?={)/m;
var rparam = /^(encode|)([\w]+(?:\[(?:\"[^\"]+\"|[^\]]+?)\]|\.[\w]+|\([^\)]*\))*|\((?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\((?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^\)])*\)|[^\(\)])+\))/m;

var rif = new XRegExp('^if\\s*\\(([^\\)]*)\\)\\s*{...}');
var relse = new XRegExp('^\\s*(?:else\\s+if\\s*\\(([^\\)]*)\\)|else)\\s*{...}');
var rcode = new XRegExp('{...}');

var rdom = /<\s*(\/{0,1}[a-zA-Z]+)(?:\s+[a-zA-Z1-9_-]+="[^"]*"|\s+[^\s]+)*?\s*(\/){0,1}\s*>/m;

var isEmpty = function (c) {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r';
};

var matchDom = function (input) {
    if (!input) return '';

    var m = rdom.exec(input),
        tagName,
        count = 0,
        str = '',
        dom = '',
        code;

    while (m) {
        if (count == 0) {

            if (m.index != 0) {
                code = input.substr(0, m.index);
                if (!/^\s+$/.test(code)) {

                    if (dom) {
                        str += parse(dom).code;
                        dom = '';
                    }
                    str += code;
                }
            }

            if (m[2] == '/') {

                if (dom) dom += m[0];
                else str += parse(m[0]).code;

            } else {
                tagName = m[1];

                dom += m[0];

                count++;
            }

        } else {
            dom += input.substr(0, m.index);

            dom += m[0];

            if (m[1] == tagName) {
                count++;

            } else if (m[1] == '/' + tagName) {
                count--;
            }
        }

        input = input.substr(m.index + m[0].length);

        m = rdom.exec(input);
    }

    if (dom) {
        str += parse(dom).code;
    }

    return str + input;
}

var parse = function (templateStr) {

    var functions = {},
        helpers = {},
        name,
        i = 0,
        len = templateStr.length,
        prev,
        curr,
        c,
        code = '',
        codeStr,
        str = "__+='";

    while (i < len) {
        curr = templateStr.charAt(i);

        if (curr == '@') {
            c = templateStr.charAt(i + 1);

            if (prev != '@' && c != '@' && !isEmpty(c)) {
                codeStr = templateStr.substr(++i);

                if (c == '{') {
                    code = rcode.exec(codeStr);

                    str += "';" + code[1] + "__+='";
                    i += code.match.length;
                } else if (c == '(') {
                    m = /\(("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\((?:\((\(.*?\)|.)*?\)|[^\)])*\)|[^)])+\)/.exec(codeStr);

                    str += "'+" + m[0] + "+'";
                    i += m[0].length;

                } else {
                    var m = rcmd.exec(codeStr);

                    if (m) {
                        name = m[2];

                        if ('if' == m[1]) {
                            code = rif.exec(codeStr);
                            str += "';"

                            do {
                                str += code[0] + matchDom(code[2]) + "}"
                                i += code.match.length;

                                code = relse.exec(templateStr.substr(i));
                            }
                            while (code);

                            str += "__+='";

                        } else {
                            i += m[0].length;

                            code = rcode.exec(codeStr);

                            if ('for' == m[1]) {

                                str += "';" + m[0] + "{" + matchDom(code[1]) + "}" + "__+='";

                            } else if ('function' == m[2]) {
                                functions[m[3]] = 'function(' + m[4] + '){' + code[1] + '}';

                            } else if ('helper' == m[2]) {
                                helpers[m[3]] = 'function(' + m[4] + '){' + razor.parse(code[1], m[4]).code + '}';
                            }

                            i += code.match.length;
                        }

                    } else {
                        m = rparam.exec(codeStr);

                        str += "'+" + (m[1] == "encode" ? "util.encodeHTML(" + m[2] + ")" : m[2]) + "+'";
                        i += m[0].length;
                    }
                }
                prev = '';
                continue;

            } else {
                str += '@';
                i++;
            }

        } else {
            if (curr == '<') {
                var next6 = templateStr.substr(i, 6);
                if (next6 == "<text>") {
                    i += 6;
                    continue;
                } else if (next6 == "</text" && templateStr.charAt(i + 6) == '>') {
                    i += 7;
                    continue;
                }
            }

            str += curr == '\\' ? '\\\\' : curr == '\'' ? '\\\'' : isEmpty(curr) ? (isEmpty(prev) ? '' : ' ') : curr;
        }

        prev = curr;
        i++;
    }

    return {
        helpers: helpers,
        functions: functions,
        code: str + "';"
    };
};

var razor = {};

razor.parse = function (templateStr, args) {
    if (typeof args !== 'string') args = "$data";

    var str = "var __='';" + (args === "$data" ? "with($data||{})" : "") + "{",
        res = parse(templateStr);

    str += res.code;

    str += "}return __;";

    res.code = str;

    return res;
};

razor.create = function (templateStr) {
    var str = 'var util=require("util");', result;

    templateStr = templateStr.replace(ruse, function (match, qt, id, name) {
        str += 'var ' + name + '=require("' + id + '");';

        return '';
    });

    result = razor.parse(templateStr);

    str += 'var T={html:function($data){' + result.code + '},helpers:{';

    if (result.helpers) {
        var helpers = [];
        for (var key in result.helpers) {
            helpers.push(key + ':' + result.helpers[key]);
        }
        str += helpers.join(',');
    }
    str += '}';

    if (result.functions) {
        for (var key in result.functions) {
            str += ',' + key + ':' + result.functions[key];
        }
    }

    str += '};T.template=T.html;';

    return str;
};

razor.nodeFn = function (templateStr) {

    try {
        return eval('[(function(){' + razor.create(templateStr) + ' return T;})()][0]');

    } catch (e) {
        return {
            html: function () {
                return "";
            }
        }
    }
};

razor.web = function (templateStr) {
    return 'define(function(require){' + razor.create(templateStr) + ' return T;});';
};

razor.node = function (templateStr) {
    return razor.create(templateStr) + "module.exports=T;";
};

module.exports = razor;
