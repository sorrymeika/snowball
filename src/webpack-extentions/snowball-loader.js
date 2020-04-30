var loaderUtils = require('loader-utils');

function replaceImport(source, _package, replaceWith) {
    const getPackageName = typeof replaceWith === 'function'
        ? replaceWith
        : function (packageName) {
            return replaceWith;
        };

    const getImportExp = function (varName, packageName, semicolon = ';') {
        if (!varName) return '';
        return "var " + varName.replace(/([$\w]+)\s+as\s+([$\w]+)/g, "$1:$2") + "=" + getPackageName(packageName) + semicolon;
    };

    // const STRING_RE = "'(?:(?:\\\\{2})+|\\\\'|[^'])*'|\"(?:(?:\\\\{2})+|\\\\\"|[^\"])*\"|`(?:(?:\\\\{2})+|\\\\`|[^`])*`";

    _package = '(' + _package + ')';

    source = source
        .replace(new RegExp("\\bimport\\s*\\*\\sas\\s+([\\w$]+)\\s+from\\s*(\"|')" + _package + "\\2\\s*;?", 'mg'), function (match, name, q, packageName) {
            return getImportExp(name, packageName);
        })
        .replace(new RegExp("\\bimport\\s*([\\w$]+)(?:\\s*,\\s*(\\{[^}]+\\}))?\\s*from\\s*(\"|')" + _package + "\\3\\s*;?", "mg"), function (match, name, names, q, packageName) {
            return getImportExp(name, packageName)
                + getImportExp(names, packageName);
        })
        .replace(new RegExp("\\bimport\\s*(\\{[^}]+\\})(?:\\s*,\\s*([\\w$]+))?\\s*from\\s*(\"|')" + _package + "\\3\\s*;?", "mg"), function (match, names, name, q, packageName) {
            return getImportExp(names, packageName)
                + getImportExp(name, packageName);
        });

    source = source
        .replace(new RegExp("\\b(?:var|const|let|,)\\s+([\\w$]+)\\s*=\\s*require\\(\\s*(\"|')" + _package + "\\2\\s*\\)\\s*(;)?", 'mg'), function (match, name, q, packageName, semicolon) {
            return getImportExp(name, packageName, semicolon || '');
        });

    return source;
}

module.exports = function (source) {
    const options = loaderUtils.getOptions(this);

    var content = replaceImport(source, "snowball", "window.Snowball");
    content = replaceImport(content, "snowball/app", "window.Snowball._app");
    content = replaceImport(content, "snowball/components", "window.Snowball._components");
    content = replaceImport(content, "snowball/graphics", "window.Snowball._graphics");
    content = replaceImport(content, "snowball/utils", "window.Snowball.util");
    content = replaceImport(content, "snowball/widget", "window.Snowball._widget");
    content = replaceImport(content, "snowball/(?!libs/).+", (packageName) => "{};throw new Error('unavaliable import `" + packageName + "`!!')");
    content = replaceImport(content, "react", "window.Snowball._React");
    content = replaceImport(content, "react-dom", "window.Snowball._ReactDOM");

    if (options && options.modules) {
        Object.keys(options.modules)
            .forEach((name) => {
                content = replaceImport(content, name, options.modules[name]);
            });
    }

    this.cacheable();

    this.callback(null, content);
};