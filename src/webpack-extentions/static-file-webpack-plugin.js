var path = require('path');
var fs = require('fs');
var JSUtils = require('../node-libs/js-utils');

function replaceBOM(text) {
    return text.replace(/^\uFEFF/i, '');
}

function compressCSS(res) {
    return replaceBOM(res)
        .replace(/\s*([;|,|{|}])\s*/img, '$1')
        .replace(/\{(\s*[-a-zA-Z]+\s*:\s*[^;}]+?(;|\}))+/mg, function (match) {
            return match.replace(/\s*:\s*/mg, ':');
        })
        .replace(/[\r\n]/mg, '')
        .replace(/;}/mg, '}')
        .replace(/\s*\/\*.*?\*\/\s*/mg, '');
}

function compressHTML(html) {
    return replaceBOM(html)
        .replace(/\s*(<(\/{0,1}[a-zA-Z]+)(?:\s+[a-zA-Z1-9_-]+="[^"]*"|\s+[^\s]+)*?\s*(\/){0,1}\s*>)\s*/img, '$1')
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/img, function (r0, r1) {
            return /^\s*$/.test(r1) ? r0 : ('<script>' + JSUtils.minify(JSUtils.toES5(r1)) + '</script>');
        })
        .replace(/<style[^>]*>([\S\s]*?)<\/style>/img, function (r0, r1) {
            return /^\s*$/.test(r1) ? r0 : ('<style>' + compressCSS(r1) + '</style>');
        });
}

function mkdirs(dirs, cb) {
    dirs = dirs.split('/');
    if (!dirs) {
        cb(null, null);
    }
    if (!dirs[0]) dirs.shift();

    var dir = '';
    for (var i = 0; i < dirs.length; i++) {
        dir = dir + '/' + dirs[i];

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    cb && cb();
}

function findFiles(dir, rpath, done) {
    if (typeof rpath === 'string') {
        rpath = new RegExp(rpath.replace(/\./g, '\\.').replace(/\*/g, '.+?'));
    }

    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    findFiles(file, rpath, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    if (rpath.test(file)) results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
}

function saveFile(savePath, source, isCopy) {
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

    if (isCopy) {
        promise = promise.then(function () {
            return new Promise(function (resolve) {
                var extname = path.extname(source);
                if (extname == '.js' || extname == '.css' || extname == '.html') {
                    fs.readFile(source, 'utf8', function (err, fileData) {
                        switch (extname) {
                            case '.js':
                                resolve(JSUtils.minify(JSUtils.toES5(fileData)));
                                break;
                            case '.css':
                                resolve(compressCSS(fileData));
                                break;
                            case '.html':
                                resolve(compressHTML(fileData));
                                break;
                        }
                    });
                } else
                    fs.readFile(source, function (err, fileData) {
                        resolve(fileData);
                    });
            });
        });
    }

    promise = promise.then(function (data) {
        return new Promise(function (resolve) {
            console.log('start save:', savePath);
            fs.writeFile(savePath, data, function (err, res) {
                console.log('save:', savePath);
                resolve(res);
            });
        });
    });

    return promise;
}

function StaticFilePlugin(options) {

    function apply(compiler) {
        compiler.plugin('emit', function (compilation, cb) {
            var output = compiler.options.output.path;
            if (output === '/' &&
                compiler.options.devServer &&
                compiler.options.devServer.outputPath) {
                output = compiler.options.devServer.outputPath;
            }

            console.log("output:", output);

            Promise.all(options.map(function (option) {
                return new Promise(function (resolve) {
                    var fileOutput = option.output || '';
                    findFiles(option.path, option.test || '*', function (err, results) {
                        var pwd = fileOutput ? path.resolve(process.cwd(), option.path) : process.cwd();
                        Promise.all(results.map(function (item) {
                            return saveFile(path.join(output, path.join(fileOutput, item.replace(pwd, ''))), item, true);
                        })).then(function () {
                            console.log('success');
                            resolve();
                        });
                    });
                });
            })).then(function () {
                cb();
            });

            console.log("compiler.plugin 'emit'", output);
        });
    }

    return {
        apply
    };
}

module.exports = StaticFilePlugin;