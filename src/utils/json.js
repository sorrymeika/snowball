!window.JSON && (window.JSON = {
    stringify: function (o) {
        var r = [];
        if (typeof o == "string") return quote(o);
        if (typeof o == "undefined") return "undefined";
        if (typeof o == "object") {
            if (o === null) return "null";
            else if (Object.prototype.toString.call(o) != "[object Array]") {
                for (var i in o)
                    r.push(arguments.callee(i) + ":" + arguments.callee(o[i]));
                r = "{" + r.join() + "}";
            } else {
                for (var i = 0; i < o.length; i++)
                    r.push(arguments.callee(o[i]));
                r = "[" + r.join() + "]";
            }
            return r;
        }
        return o.toString();

        function quote(string) {
            var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
            var meta = {
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                '"': '\\"',
                '\\': '\\\\'
            };
            escapable.lastIndex = 0;
            return escapable.test(string) ?
                    '"' + string.replace(escapable, function (a) {
                        var c = meta[a];
                        return typeof c === 'string' ? c :
                            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    }) + '"' :
                '"' + string + '"';
        }
    },
    parse: function (str) {
        return (new Function("return " + str))()
    }
});