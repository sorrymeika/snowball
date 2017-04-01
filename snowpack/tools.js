var UglifyJS = require('uglify-js');
var razor = require('./razor');

var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var fsUtil = require('./fs');

var htmlMinifier = require('html-minifier');

var postcss = require('postcss');
var cssnano = require('cssnano');
var autoprefixer = require('autoprefixer');

// function minifyCSS(res) {
//     return removeBOMHeader(res).replace(/\s*([;|,|\{|\}])\s*/img, '$1').replace(/\{(\s*[-a-zA-Z]+\s*\:\s*[^;\}]+?(;|\}))+/mg, function (match) {
//         return match.replace(/\s*:\s*/mg, ':');
//     }).replace(/[\r\n]/mg, '').replace(/;}/mg, '}').replace(/\s*\/\*.*?\*\/\s*/mg, '');
// }
function minifyCSS(css) {
    return postcss([cssnano]).process(css);
}

function transformCSSForDevelopment(css) {
    return postcss([autoprefixer]).process(css);
}

function removeBOMHeader(text) {
    return text.replace(/^\uFEFF/i, '');
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

var REQUIRE_RE = /"(?:(?:\\{2})+|\\"|[^"])*"|'(?:(?:\\{2})+|\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:(?:\\{2})+|\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g

function parseDependencies(code) {
    var ret = [];

    code.replace(REQUIRE_RE, function (m, m1, m2) {
        if (m2) {
            ret.push(m2)
        }
    })

    return ret
}

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

var definedIdRE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*define|(?:^|\uFEFF|[^$])(\bdefine\(([\'\"])[^\2]+\2)/g;

var cmdRE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|(?:^|\b|\uFEFF)(module\.exports\s*=|exports\.[a-z0-9A-Z\._]+\s*=)/mg;
var defineRE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*define|(?:^|\uFEFF|[^$])(\bdefine\()/g;
var domRE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\s*(return\s+|=|\:|\()\s*(<([a-zA-Z]+)[^>]*>[\s\S]*?<\/\3>)\s*(,|;|\}|\))/mg;

/**
 * 
 * @param {String} moduleId 
 * @param {String} jsCode js代码
 * @param {Array|String} [dependencies] 依赖的js
 * @param {Array} [exclude] 依赖从中排除的文件
 */
function transformSnowballJS(moduleId, jsCode, dependencies, exclude) {
    if ((hasFirstGroupOfRegExp(cmdRE, jsCode) || hasFirstGroupOfRegExp(REQUIRE_RE, jsCode)) &&
        !hasFirstGroupOfRegExp(defineRE, jsCode)) {
        jsCode = "define(function (require, exports, module) {\n" + jsCode + "\n});\n";
    }

    jsCode = removeBOMHeader(jsCode);
    jsCode = jsCode.replace(domRE, function (match, symbol, dom, tagName, end) {
        return dom ?
            symbol + "'" + dom.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/(\s*(\r|\n)+\s*)+/g, ' ') + "'" + end :
            match;
    });

    if (typeof dependencies == 'string') dependencies = [dependencies];

    if (hasFirstGroupOfRegExp(definedIdRE, jsCode)) {
        return jsCode;
    }

    jsCode = jsCode.replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*define|(^|\uFEFF|[^$])(\bdefine\((?:\s*(\[[^\]]*\]){0,1}\s*,\s*){0,1})/mg, function (match, pre, fn, deps) {
        if (!fn) return match;
        deps = deps ? JSON.parse(deps.replace(/\'/g, '"')) : [];

        if (dependencies && dependencies.length) {
            deps = concat(dependencies, deps);
        }

        if (exclude !== true) {
            deps = concat(deps, parseDependencies(jsCode));
        }

        if (exclude && exclude.length) {
            for (var i = deps.length - 1; i >= 0; i--) {
                var pathA = deps[i];
                pathA = /^(\.)/.test(pathA) ? path.resolve(path.dirname(moduleId + ".js"), pathA) : path.resolve(pathA);

                for (var j = 0; j < exclude.length; j++) {
                    var pathB = exclude[j];
                    pathB = /^(\.)/.test(pathB) ? path.resolve(path.dirname(moduleId + ".js"), pathB) : path.resolve(pathB);

                    if (pathA == pathB) {
                        deps.splice(i, 1);
                        break;
                    }
                }
            }
        }

        return pre + 'define(' + '"' + moduleId + '",' + (JSON.stringify(deps) + ',');
    });

    return jsCode;
}

function minifyHTML(html) {
    var html = removeBOMHeader(html);

    html = htmlMinifier.minify(html, {
        minifyJS: false,
        minifyCSS: false
    });
    // html = html.replace(/\s*(<(\/{0,1}[a-zA-Z]+)(?:\s+[a-zA-Z1-9_-]+="[^"]*"|\s+[^\s]+)*?\s*(\/){0,1}\s*>)\s*/img, '$1')

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

function isRazorTemplate(fileName) {
    return /\.(tpl|html)$/.test(fileName);
}

function combineSnowballJS(fileList, ids, destPath) {
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
            if (isRazorTemplate(fileList[i]))
                data = razor.web(data);

            text += minifyJS(transformSnowballJS(ids[i], data));
        });

        return save(destPath, text);
    });
}

/**
 * 根据config合并JS到指定文件夹
 * 
 * @example
 * combineJS('/root', '/root/dest', {
 *     destFileName: [moduleId1, moduleId2],
 *     destFileName1: {
 *         moduleId1: "filePath1",
 *         moduleId2: "filePath1"
 *     }
 * });
 * 
 * @param {String} baseDir js当前所在文件夹
 * @param {String} destDir 目标存放文件夹
 * @param {Object} config 合并的配置
 */
function combineJS(baseDir, destDir, config) {
    var map = {};

    for (var destPath in config) {
        var fileList = [],
            paths = config[destPath],
            ids = [],
            item;

        if (!paths.length) {
            for (var key in paths) {
                item = paths[key] || key;

                if (!isRazorTemplate(item) && !/\.js$/.test(item)) item += '.js';

                fileList.push(path.join(baseDir, item));
                ids.push(key);
            }
        } else {
            for (var i = 0, n = paths.length; i < n; i++) {
                item = paths[i];

                fileList.push(path.join(baseDir, /\.js$/.test(item) ? item : (item + '.js')));
                ids.push(item);
            }
        }

        map[destPath] = ids;

        if (fileList.length) {
            combineSnowballJS(fileList, ids, path.join(destDir, /\.js$/.test(destPath) ? destPath : (destPath + '.js')));
        }
    }

    return map;
}

function moveStaticFile(savePath, source) {
    var promise = new Promise(function (resolve) {
        var dir = path.dirname(savePath);
        fs.exists(dir, function (exists) {
            if (!exists) {
                mkdirs(dir, function (err, r) {
                    resolve(source);
                });
            } else {
                resolve(source);
            }
        });
    });

    console.log('move to:' + savePath);

    promise = promise.then(function () {
        return new Promise(function (resolve) {
            var extname = path.extname(source);
            if (extname == '.js' || extname == '.css' || extname == '.html') {
                fs.readFile(source, 'utf8', function (err, fileData) {
                    switch (extname) {
                        case '.js':
                            resolve(minifyJS(fileData));
                            break;
                        case '.css':
                            minifyCSS(fileData).then(function () {
                                resolve();
                            })
                            break;
                        case '.html':
                            resolve(minifyHTML(fileData));
                            break;
                    }
                });
            } else
                fs.readFile(source, function (err, fileData) {
                    resolve(fileData);
                })
        });
    });

    promise = promise.then(function (data) {
        return new Promise(function (resolve) {
            console.log('start save:', savePath);
            fs.writeFile(savePath, data, function (err, res) {
                console.log('save:', savePath);
                resolve(res);
            });
        })
    })

    return promise;
};

/**
 * 移动静态文件，并压缩其中的CSS,JS,HTML文件
 * 
 * @example
 * static('','', {
 *     "/ueditor": "../components/ueditor",
 *     "/upload": "../upload"
 * })
 * 
 * @param {String} baseDir 
 * @param {String} destDir 
 * @param {Object} config 
 */
function moveDir(baseDir, destDir, config) {
    return Promise.all(Object.keys(config).map(function (outputDir) {
        var sourceDir = config[outputDir];
        sourceDir = path.join(baseDir, sourceDir);

        if (/^\//.test(outputDir)) outputDir = '.' + outputDir;
        outputDir = path.join(destDir, outputDir);

        return new Promise(function (resolve) {
            fsUtil.find(sourceDir, '*', function (err, results) {
                Promise.all(results.map(function (fileName) {
                    return moveStaticFile(path.join(outputDir, fileName.replace(sourceDir, '')), fileName);
                })).then(function () {
                    resolve();
                });
            });
        });
    }))
}

var tools = {
    config: function (config) {
        __compressor_global_defs = config.global_defs;
    },
    removeBOMHeader: removeBOMHeader,
    combineJS: combineJS,
    transformSnowballJS: transformSnowballJS,
    minifyJS: minifyJS,
    minifyCSS: minifyCSS,
    transformCSSForDevelopment: transformCSSForDevelopment,
    minifyHTML: minifyHTML,
    moveDir: moveDir,
    save: save,
    copy: copy
};

module.exports = tools;