var UglifyJS = require('uglify-js');
var razor = require('./razor');

var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');

function removeBOMHeader(text) {
    return text.replace(/^\uFEFF/i, '');
}

function compressCss(res) {
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

function seajslize(jsCode) {
    if ((hasFirstGroupOfRegExp(rcmd, jsCode) || hasFirstGroupOfRegExp(REQUIRE_RE, jsCode)) && !hasFirstGroupOfRegExp(rdefine, jsCode)) {
        jsCode = "define(function (require, exports, module) {" + jsCode + "});";
    }
    return jsCode;
}

var domRE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\s*(return\s+|=|\:|\()\s*(<([a-zA-Z]+)[^>]*>[\s\S]*?<\/\3>)\s*(,|;|\}|\))/mg;

function formatJs(jsCode) {
    return seajslize(jsCode).replace(domRE, function (match, symbol, dom, tagName, end) {
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

function compressJs(code, mangle_names) {
    code = removeBOMHeader(code).replace(/\/\/<--development[\s\S]+?\/\/development-->/img, '');

    var ast = UglifyJS.parse(code);
    ast.figure_out_scope();
    ast = ast.transform(getCompressor());
    ast.compute_char_frequency();
    ast.mangle_names(mangle_names);
    code = ast.print_to_string();

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

function replaceDefine(id, code, requires, exclude) {
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

function compressHTML(html) {
    return removeBOMHeader(html).replace(/\s*(<(\/{0,1}[a-zA-Z]+)(?:\s+[a-zA-Z1-9_-]+="[^"]*"|\s+[^\s]+)*?\s*(\/){0,1}\s*>)\s*/img, '$1')
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/img, function (r0, r1) {
            return /^\s*$/.test(r1) ? r0 : ('<script>' + compressJs(r1) + '</script>');
        }).replace(/<style[^>]*>([\S\s]*?)<\/style>/img, function (r0, r1) {
            return /^\s*$/.test(r1) ? r0 : ('<style>' + compressCss(r1) + '</style>');
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

var Tools = function (baseDir, destDir) {
    this.baseDir = baseDir;
    this.destDir = destDir;

    this.async = Promise.resolve();
}

Tools.prototype = {

    combine: function (pathDict) {
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
                                compressCss(data) :
                                compressJs(replaceDefine(ids[i], formatJs(data)));
                        });

                        return self.save(destPath, text);
                    });

                    self.async = self.async.then(promise);

                })(fileList, ids, isCss, path.join(self.destDir, isCss || /\.js$/.test(destPath) ? destPath : (destPath + '.js')));

            }

        }

        return map;
    },

    html: function (fileList, api, combinedPathDict) {

        api = '<meta name="api-base-url" content="' + api + '" />';
        if (!(fileList instanceof Array)) fileList = [fileList];

        var self = this,
            now = new Date().getTime();

        fileList.forEach(function (fileName) {
            var promise = new Promise(function (resolve) {

                fs.readFile(path.join(self.baseDir, fileName), { encoding: 'utf-8' }, function (err, html) {

                    html = html.replace(/<script[^>]+debug[^>]*>[\S\s]*?<\/script>/img, '')
                        .replace(/<link[^>]+debug[^>]*\/*\s*>/img, '')
                        .replace(/<head>/i, '<head>' + api);

                    if (combinedPathDict) {
                        var combinedFiles = '';
                        for (var destCombinePath in combinedPathDict) {
                            var isCss = /\.css$/.test(destCombinePath);

                            combinedFiles += isCss ? '<link href="' + destCombinePath + '?v=' + now + '" rel="stylesheet" type="text/css" />'
                                : ('<script src="' + destCombinePath + '.js?v=' + now + '"></script>');
                        }

                        combinedFiles += '<script data-template="razor" src="' + self.razorUri + '?v=' + now + '"></script>';

                        html = html.replace(/<\/head>/i, combinedFiles + '</head>');
                    }

                    html = compressHTML(html);

                });


            }).then(function (html) {

                return self.save(path.join(self.destDir, fileName), html);
            });

            self.async = self.async.then(promise);
        });

        return this;
    },

    resource: function (resourceDir) {
        var self = this;

        this.async.then(Promise.all(resourceDir.map(function (dir) {

            return new Promise(function (resolve) {

                fse.copy(path.join(self.baseDir, dir), path.join(self.destDir, dir), function () {

                    resolve();
                })
            })
        })));
    },

    compress: function (fileList) {

        var self = this,
            dict;

        if (fileList.length) {
            dict = {};
            fileList.forEach(function (fileName, i) {
                dict[fileName] = '';
            });

        } else {
            dict = fileList;
        }

        for (var key in dict) {
            (function (fileName, readPath) {
                var promise;

                if (/\.css$/.test(fileName)) {

                    promise = new Promise(function (resolve) {

                        fs.readFile(path.join(self.baseDir, readPath || fileName), {
                            encoding: 'utf-8'

                        }, function (err, text) {
                            self.save(path.join(self.destDir, fileName), resolve);
                        });
                    })

                } else if (/\.html/.test(fileName)) {

                    promise = new Promise(function (resolve) {

                        fs.readFile(path.join(self.baseDir, readPath || fileName), {
                            encoding: 'utf-8'

                        }, function (err, text) {
                            self.save(path.join(self.destDir, fileName), compressHTML(text), resolve);
                        });
                    });

                } else {

                    promise = new Promise(function (resolve) {

                        var jsFileName = fileName + '.js';

                        fs.readFile(path.join(self.baseDir, readPath ? readPath + '.js' : jsFileName), {
                            encoding: 'utf-8'
                        }, function (err, text) {
                            if (err) console.log(path.join(self.baseDir, readPath || jsFileName));

                            text = compressJs(replaceDefine(fileName, text));

                            self.save(path.join(self.destDir, jsFileName), text, resolve);
                        });
                    });
                }

                self.async = self.async.then(promise);

            })(key, dict[key]);
        }


        return this;
    },

    razorUri: 'js/razor.text.js',

    razor: function (fileList) {
        var self = this;

        var result = '';

        var promise = Promise.all(fileList.map(function (fileName, i) {

            return new Promise(function (resolve) {

                fs.readFile(path.join(self.baseDir, fileName + '.tpl'), {
                    encoding: 'utf-8'

                }, function (err, text) {
                    if (err) console.log(fileName)

                    text = compressJs(replaceDefine(fileName, razor.web(removeBOMHeader(text))));

                    result += text;

                    self.save(path.join(self.destDir, 'js/' + fileName + '.js'), text, resolve);
                });

            })

        })).then(function () {
            return self.save(path.join(self.destDir, self.razorUri), result);
        });

        self.async = self.async.then(promise);

        return this;
    },

    save: save,
    copy: copy,

    build: function (options) {
        options.combine && this.combine(options.combine);
        options.html && this.html(options.html, options.api, options.combine);
        options.resource && this.resource(options.resource);
        options.compress && this.compress(options.compress);
        options.razor && this.razor(options.razor);

        this.async = this.async.then(function () {
            console.log('finish')
        });
    }
};

Tools.compressCss = compressCss;
Tools.compressHTML = compressHTML;
Tools.compressJs = function (code, names) {
    try {
        return compressJs(code, names);
    } catch (e) {
        console.log(code);
        console.log(e);
    }
};


Tools.setJsCompressorGlobalDef = function (globalDef) {
    __compressor_global_defs = globalDef;
}

Tools.save = save;
Tools.copy = copy;
Tools.replaceDefine = replaceDefine;
Tools.removeBOMHeader = removeBOMHeader;
Tools.formatJs = formatJs;

var rwebresource = /([^@]{0,1})@webresource\(\s*([\"|\'])([^\2]+)\2\s*\)/mg;
Tools.webresource = function (webresource, template) {
    return template.replace(rwebresource, '$1' + webresource + '$3');
};

module.exports = Tools;