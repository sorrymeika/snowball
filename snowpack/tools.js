var UglifyJS = require('uglify-js');
var razor = require('./razor');

var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');

var htmlMinifier = require('html-minifier');

var postcss = require('postcss');
var cssnano = require('cssnano');
var autoprefixer = require('autoprefixer');

function postCSS(css) {
    return postcss([cssnano]).process(css);
}

function postCSSForDevelopment(css) {
    return postcss([autoprefixer]).process(css);
}

function removeBOMHeader(text) {
    return text.replace(/^\uFEFF/i, '');
}

function minifyCSS(res) {
    return removeBOMHeader(res).replace(/\s*([;|,|\{|\}])\s*/img, '$1').replace(/\{(\s*[-a-zA-Z]+\s*\:\s*[^;\}]+?(;|\}))+/mg, function (match) {
        return match.replace(/\s*:\s*/mg, ':');
    }).replace(/[\r\n]/mg, '').replace(/;}/mg, '}').replace(/\s*\/\*.*?\*\/\s*/mg, '');
}

var rcmd = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|(?:^|\b|\uFEFF)(module\.exports\s*=|exports\.[a-z0-9A-Z\._]+\s*=)/mg;
var rdefine = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*define|(?:^|\uFEFF|[^$])(\bdefine\()/g;

function hasFirstGroupOfRegExp(regex, text) {
    regex.lastIndex = 0;
    var m;
    do {
        m = regex.exec(text);
        if (m && m[1]) {
            return true;
        }
    } while (m);

    return false;
}

var domRE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\s*(return\s+|=|\:|\()\s*(<([a-zA-Z]+)[^>]*>[\s\S]*?<\/\3>)\s*(,|;|\}|\))/mg;

function transformSnowballJS(jsCode) {
    if ((hasFirstGroupOfRegExp(rcmd, jsCode) || hasFirstGroupOfRegExp(REQUIRE_RE, jsCode)) && !hasFirstGroupOfRegExp(rdefine, jsCode)) {
        jsCode = "define(function (require, exports, module) {" + jsCode + "});";
    }

    return jsCode.replace(domRE, function (match, symbol, dom, tagName, end) {
        return dom ? symbol + "'" + dom.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/(\s*(\r|\n)+\s*)+/g, ' ') + "'" + end : match;
    });
}

var __compressor;
var __compressor_global_defs;

function getCompressor() {
    if (!__compressor)
        __compressor = UglifyJS.Compressor({
            sequences: true,  // join consecutive statemets with the “comma operator”
            properties: true,  // optimize property access: a["foo"] → a.foo
            drop_console: true,
            drop_debugger: true,  // discard “debugger” statements
            unsafe: false, // some unsafe optimizations (see below)
            conditionals: true,  // optimize if-s and conditional expressions
            comparisons: true,  // optimize comparisons
            evaluate: true,  // evaluate constant expressions
            booleans: true,  // optimize boolean expressions
            loops: true,  // optimize loops
            unused: true,  // drop unused variables/functions
            hoist_funs: true,  // hoist function declarations
            hoist_vars: false, // hoist variable declarations
            if_return: true,  // optimize if-s followed by return/continue
            join_vars: true,  // join var declarations
            cascade: true,  // try to cascade `right` into `left` in sequences
            side_effects: true,  // drop side-effect-free statements
            warnings: false,  // warn about potentially dangerous optimizations/code
            dead_code: true,  // discard unreachable code
            global_defs: Object.assign({
                ENV: "production"
            }, __compressor_global_defs)
        });

    return __compressor;
}

function minifyJS(code, mangle_names) {
    code = removeBOMHeader(code).replace(/\/\/<--development[\s\S]+?\/\/development-->/img, '');

    try {
        var ast = UglifyJS.parse(code);
        ast.figure_out_scope();
        ast = ast.transform(getCompressor());
        ast.compute_char_frequency();
        ast.mangle_names(mangle_names);
        code = ast.print_to_string();
    } catch (e) {
        console.log(code);
        throw e;
    }

    return code;
};

function concat() {
    var res = [],
        arr;

    for (var i = 0; i < arguments.length; i++) {
        arr = arguments[i];
        arr.forEach(function (item) {
            if (res.indexOf(item) == -1) {
                res.push(item);
            }
        });
    }
    return res;
};

var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
var SLASH_RE = /\\\\/g;

function parseDependencies(code) {
    var ret = [];
    //var m = code.match(REQUIRE_NAME_RE);
    //var requireRe;
    //requireRe = new RegExp("\\b" + m[1] + "\\s*\\(\\s*([\"'])(.+?)\\1\\s*\\)", 'g');

    code.replace(SLASH_RE, "")
        .replace(REQUIRE_RE, function (m, m1, m2) {
            if (m2) {
                ret.push(m2)
            }
        })

    return ret
}

var definedIdRE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*define|(?:^|\uFEFF|[^$])(\bdefine\(([\'\"])[^\2]+\2)/g;

function setModuleDefine(id, code, requires, exclude) {
    if (typeof requires == 'string') requires = [requires];

    code = removeBOMHeader(code);

    if (hasFirstGroupOfRegExp(definedIdRE, code)) {
        return code;
    }

    return code.replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*define|(^|\uFEFF|[^$])(\bdefine\((?:\s*(\[[^\]]*\]){0,1}\s*,\s*){0,1})/mg, function (match, pre, fn, param) {
        if (!fn) return match;
        param = param ? JSON.parse(param.replace(/\'/g, '"')) : [];

        if (requires && requires.length) {
            param = concat(requires, param);
        }

        if (exclude !== true) {
            param = concat(param, parseDependencies(code));
        }
        if (exclude && exclude.length) {
            for (var i = param.length - 1; i >= 0; i--) {
                var pathA = param[i];
                pathA = /^(\.)/.test(pathA) ? path.resolve(path.dirname(id + ".js"), pathA) : path.resolve(pathA);

                for (var j = 0; j < exclude.length; j++) {

                    var pathB = exclude[j];
                    pathB = /^(\.)/.test(pathB) ? path.resolve(path.dirname(id + ".js"), pathB) : path.resolve(pathB);

                    if (pathA == pathB) {
                        param.splice(i, 1);
                        break;
                    }
                }
            }
        }

        return pre + 'define(' + '"' + id + '",' + (JSON.stringify(param) + ',');
    });
}

function minifyHTML(html) {
    var html = removeBOMHeader(html);

    html = htmlMinifier.minify(html, {
        minifyJS: false,
        minifyCSS: false
    });
    // html = html.replace(/\s*(<(\/{0,1}[a-zA-Z]+)(?:\s+[a-zA-Z1-9_-]+="[^"]*"|\s+[^\s]+)*?\s*(\/){0,1}\s*>)\s*/img, '$1')
    // html = html.replace(/<style[^>]*>([\S\s]*?)<\/style>/img, function (r0, r1) {
    //     return /^\s*$/.test(r1) ? r0 : ('<style>' + minifyCSS(r1) + '</style>');
    // })

    html = html.replace(/\s*<script[^>]*>([\S\s]*?)<\/script>\s*/img, function (r0, r1) {
        return /^\s*$/.test(r1) ? r0 : ('<script>' + minifyJS(r1) + '</script>');
    });

    var styleRE = /<style[^>]*>([\S\s]*?)<\/style>/img;

    var htmlSplits = [];
    var allProcess = [];
    var start = 0;

    for (var m = styleRE.exec(html); m; m = styleRE.exec(html)) {
        console.log(start, m.index, m.index + m[0].length);
        htmlSplits.push(html.substr(start, m.index - start));

        start = m.index + m[0].length;

        allProcess.push(postcss([cssnano]).process(m[1]));
    }

    return Promise.all(allProcess).then(function (results) {
        var result = '';

        results.forEach(function (cssResult, i) {
            result += htmlSplits[i];
            result += '<style>' + cssResult.css + '</style>';
        });

        result += html.substr(start);

        return result;
    });
}

function _save(savePath, data, isCopy, callback) {
    var dir = path.dirname(savePath);

    var promise = new Promise(function (resolve) {
        fs.exists(dir, function (exists) {
            if (!exists) {
                fse.mkdirs(dir, function (err, r) {
                    resolve(data);
                });
            } else {
                resolve(data);
            }
        });
    }).then(function () {
        if (isCopy) {
            return new Promise(function (resolve) {
                fs.readFile(data, function (err, res) {
                    resolve(res);
                });
            })
        }
        return data;
    }).then(function (buffer) {
        return new Promise(function (resolve) {
            fs.writeFile(savePath, buffer, resolve);
        })
    }).then(function () {
        console.log('save', savePath)

    }).then(callback);

    return promise;
};

function save(savePath, data, callback) {
    return _save(savePath, data, false, callback);
}

function copy(sourcePath, destPath, callback) {
    return _save(sourcePath, destPath, true, callback)
}

function Tools(options) {
    this.baseDir = options.baseDir;
    this.destDir = options.destDir;

    this.promise = Promise.resolve();
}

Tools.prototype.combine = function (pathDict) {
    var self = this;
    var map = {};

    for (var destPath in pathDict) {
        var fileList = [],
            paths = pathDict[destPath],
            ids = [],
            isCss = /\.css$/.test(destPath),
            item;

        if (!paths.length) {
            for (var key in paths) {
                item = paths[key] || key;
                if (/\.(tpl|html|cshtml)$/.test(item)) {

                } else if (!/\.js$/.test(item))
                    item += '.js';

                fileList.push(path.join(self.baseDir, item));
                ids.push(key);
            }
        } else {
            for (var i = 0, n = paths.length; i < n; i++) {
                item = paths[i];

                fileList.push(path.join(self.baseDir, isCss || /\.js$/.test(item) ? item : (item + '.js')));
                ids.push(item);
            }
        }

        map[destPath] = ids;

        if (fileList.length) {
            (function (fileList, ids, isCss, destPath) {
                var promise = Promise.all(fileList.map(function (fileName) {

                    return new Promise(function (resolve) {
                        fs.readFile(fileName, 'utf8', function (err, res) {
                            if (err) {
                                if (/\.js$/.test(fileName)) {
                                    fs.readFile(fileName + "x", 'utf8', function (err, res) {
                                        if (err) {
                                            console.error(fileName, err);
                                        }
                                        resolve(res);
                                    });
                                    return;
                                } else
                                    console.error(fileName, err);
                            }
                            resolve(res);
                        });
                    });

                })).then(function (result) {
                    var text = '';

                    result.forEach(function (data, i) {
                        if (/\.(tpl|html|cshtml)$/.test(fileList[i]))
                            data = razor.web(data);

                        text += isCss ?
                            minifyCSS(data) :
                            minifyJS(setModuleDefine(ids[i], transformSnowballJS(data)));
                    });

                    return self.save(destPath, text);
                });

                self.promise = self.promise.then(promise);

            })(fileList, ids, isCss, path.join(self.destDir, isCss || /\.js$/.test(destPath) ? destPath : (destPath + '.js')));
        }
    }

    return map;
}

Tools.prototype.save = save;

Tools.prototype.copy = copy;

Tools.prototype.copy = copy;

Tools.prototype.postCSS = function () {
};

Tools.postCSSForDevelopment = postCSSForDevelopment;
Tools.postCSS = postCSS;
Tools.minifyCSS = minifyCSS;
Tools.minifyHTML = minifyHTML;
Tools.minifyJS = minifyJS;

Tools.setJsCompressorGlobalDef = function (globalDef) {
    __compressor_global_defs = globalDef;
}

Tools.save = save;
Tools.copy = copy;
Tools.setModuleDefine = setModuleDefine;
Tools.removeBOMHeader = removeBOMHeader;
Tools.transformSnowballJS = transformSnowballJS;

var rwebresource = /([^@]{0,1})@webresource\(\s*([\"|\'])([^\2]+)\2\s*\)/mg;
Tools.webresource = function (webresource, template) {
    return template.replace(rwebresource, '$1' + webresource + '$3');
};

module.exports = Tools;