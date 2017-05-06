var fs = require('fs');
var fsc = require('./fs');
var path = require('path');
var razor = require('./razor');
var _ = require('lodash');
var tools = require('./tools');
var sass = require('node-sass');
var sprity = require('./sprity');
var httpProxy = require('./http-proxy');

function pad(num, n) {
    var a = '0000000000000000' + num;
    return a.substr(a.length - (n || 2));
}

function formatDate(d, f) {
    if (typeof d === "string" && /^\/Date\(\d+\)\/$/.test(d)) {
        d = new Function("return new " + d.replace(/\//g, ''))();
    } else if (typeof d === 'string') {
        f = d, d = new Date;
    } else if (typeof d === 'number' || !d) {
        d = new Date(d);
    }

    var y = d.getFullYear() + "", M = d.getMonth() + 1, D = d.getDate(), H = d.getHours(), m = d.getMinutes(), s = d.getSeconds(), mill = d.getMilliseconds() + "0000";
    return (f || 'yyyy-MM-dd HH:mm:ss').replace(/\y{4}/, y)
        .replace(/y{2}/, y.substr(2, 2))
        .replace(/M{2}/, pad(M))
        .replace(/M/, M)
        .replace(/d{2,}/, pad(D))
        .replace(/d/, d)
        .replace(/H{2,}/i, pad(H))
        .replace(/H/i, H)
        .replace(/m{2,}/, pad(m))
        .replace(/m/, m)
        .replace(/s{2,}/, pad(s))
        .replace(/s/, s)
        .replace(/f+/, function (w) {
            return mill.substr(0, w.length)
        })
}

function getModuleId() {
    var args = [].slice.apply(arguments);
    var result = args.join('/').replace(/[\\]+/g, '/').replace(/([^\:\/]|^)[\/]{2,}/g, '$1/').replace(/([^\.]|^)\.\//g, '$1');
    var flag = true;
    while (flag) {
        flag = false;
        result = result.replace(/([^\/]+)\/\.\.(\/|$)/g, function (match, name) {
            if (name == '..') return match;
            if (!flag) flag = true;
            return '';
        })
    }
    return result.replace(/\/$/, '');
};
var transformSnowballJS = tools.transformSnowballJS;

// if (__dirname != process.cwd()) process.chdir(__dirname);

function absolutePath(...paths) {
    if (paths[0][0] !== '/') paths.unshift(process.cwd());
    return path.join(...paths);
}

function trimPath(path) {
    return path.replace(/(^\/)|(\/$)/g, '');
}

function combineRouters(config) {
    var result = {};
    config.projects.forEach(function (project) {
        for (var key in project.route) {
            var router = project.route[key];
            var regexStr = (trimPath(project.root) + '/' + trimPath(key)).replace(/^\.\//, '');

            if (typeof router == 'string') {
                router = {
                    controller: router,
                    template: router
                }
            } else {
                router = _.extend({}, router);
            }
            _.extend(router, {
                controller: getModuleId("views", router.controller),
                template: getModuleId("template", router.template)
            });

            router.root = project.root;

            result[regexStr] = router;
        }
    });

    return result;
}

exports.loadConfig = function (callback) {
    return new Promise(function (resolve) {
        var exec = require('child_process').exec;

        exec('ifconfig', (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                return;
            }
            var matchIp = stdout.match(/\sen0\:[\s\S]+?\sinet\s(\d+\.\d+\.\d+\.\d+)/);

            resolve(matchIp ? matchIp[1] : '127.0.0.1');
        });
    }).then(function (ip) {
        var map = {
            ip: ip
        }
        console.log(ip);

        return new Promise(function (resolve) {
            fs.readFile(absolutePath('./global.json'), {
                encoding: 'utf-8'
            }, function (err, globalStr) {
                globalStr = globalStr.replace(/\$\{(\w+)\}/g, function (match, key) {
                    return (key in map) ? map[key] : match;
                })

                var globalConfig = JSON.parse(globalStr);
                globalConfig.routes = {};

                resolve(globalConfig);
            })
        });
    }).then(function (globalConfig) {
        return Promise.all(globalConfig.projects.map(function (project, i) {
            return new Promise(function (resolve) {
                fs.readFile(absolutePath(project, 'config.json'), {
                    encoding: 'utf-8'
                }, function (err, data) {
                    var config = JSON.parse(data);
                    config.root = project;

                    resolve(config);
                });
            });
        })).then(function (results) {
            globalConfig.projects = results;

            callback(globalConfig);

            return globalConfig;
        })
    })
}

function createIndex(config, callback) {
    fs.readFile(absolutePath('./root.html'), {
        encoding: 'utf-8'
    }, function (err, html) {
        var T = razor.nodeFn(tools.removeBOMHeader(html));
        var rimg = /url\(("|'|)([^\)]+)\1\)/g;

        Promise.all(config.css.map(function (cssPath, i) {
            return new Promise(function (resolve) {
                fs.readFile(absolutePath(cssPath), {
                    encoding: 'utf-8'
                }, function (err, style) {
                    resolve(tools.removeBOMHeader(style));
                });
            });
        })).then(function (styles) {
            var style = styles.join('').replace(rimg, function (r0, r1, r2) {
                return /^data\:image\//.test(r2) ? r0 : ("url(images/" + r2 + ")");
            });

            var result = T.html(_.extend({}, config, {
                style: "<style>" + style + "</style>",
                routes: combineRouters(config)
            }));

            callback(null, result);
        });
    });
}

exports.createIndex = createIndex;

exports.startWebServer = function (config) {
    var express = require('express');
    var app = express();

    config.resourceMapping = {};

    app.use('/dest', express.static(absolutePath(config.dest)));

    if (config.static) {
        Object.keys(config.static).forEach(function (key) {
            app.use(key, express.static(absolutePath(config.static[key])));
        });
    }

    config.images.forEach(function (imageDir) {
        app.use('/images', express.static(absolutePath(imageDir)));
    });

    app.get('/', function (req, res) {
        createIndex(config, function (err, html) {
            res.send(html);
        });
    });

    config.projects.forEach(function (project) {
        var root = trimPath(project.root);
        var requires = [];

        for (var key in project.css) {
            project.css[key] && project.css[key].forEach(function (file) {
                requires.push(getModuleId(project.root, file));
            });
        }

        var sprite = project.sprite;
        if (sprite) {
            sprite.out = absolutePath(root, sprite.out);
            sprite.src = absolutePath(root, sprite.src);
            sprite.template = absolutePath(root, sprite.template);
            sprity.create(sprite);
        }

        app.all((root && root != '.' ? "/" + root : '') + '/template/[\\S\\s]+.js', function (req, res, next) {
            var filePath = req.url.replace(/\.js(\?.*){0,1}$/, '');

            fsc.readFirstExistentFile(['.' + filePath + '.html', '.' + filePath + '.cshtml', '.' + filePath + '.tpl'], function (err, text) {
                if (err) {
                    next();
                    return;
                }
                text = tools.removeBOMHeader(text);
                text = razor.web(text);
                res.set('Content-Type', "text/javascript; charset=utf-8");
                res.send(text);
            });
        });

        app.all((root && root != '.' ? "/" + root : '') + '/views/[\\S\\s]+.js', function (req, res, next) {
            var filePath = "." + req.url;

            fsc.readFirstExistentFile([filePath, filePath + 'x'], function (err, text) {
                if (err) {
                    next();
                    return;
                }

                text = tools.removeBOMHeader(text);
                text = transformSnowballJS(filePath.replace(/^\/|\.js$/g, ''), text, requires);

                res.set('Content-Type', "text/javascript; charset=utf-8");
                res.send(text);
            });
        });
    });

    app.all('*.js', function (req, res, next) {
        var filePath = req.url;
        var isRazorTpl = /\.(html|tpl|cshtml)\.js$/.test(filePath);
        var moduleId = filePath.replace(/^\/|\.jsx?$/g, '');
        var exts;

        if (isRazorTpl) {
            exts = [moduleId];
        } else {
            exts = [filePath, filePath + 'x'];
        }

        fsc.readFirstExistentFile(
            _.map(config.projects, 'root')
                .concat(config.path)
                .map((projPath) => absolutePath(projPath)),
            exts,
            function (err, text) {
                console.log(filePath);

                if (err) {
                    next();
                    return;
                }

                text = tools.removeBOMHeader(text);
                if (isRazorTpl) text = razor.web(text);
                text = transformSnowballJS(moduleId, text);

                res.set('Content-Type', "text/javascript; charset=utf-8");
                res.send(text);
            }
        );
    });

    config.projects.forEach(function (project) {
        app.use(express.static(absolutePath(project.root)));
    });

    config.path.forEach(function (searchPath) {
        app.use(express.static(absolutePath(searchPath)));
    });

    app.all('*.css', function (req, res, next) {
        fsc.firstExistentFile(
            _.map(config.projects, 'root')
                .concat(config.path)
                .map(projPath => absolutePath(projPath)),
            [req.params[0] + '.scss'],
            function (fileName) {
                if (!fileName) {
                    next();
                    return;
                }

                sass.render({
                    file: fileName
                }, function (err, result) {
                    if (err) {
                        console.log(err);
                        next();
                    } else {
                        res.set('Content-Type', "text/css; charset=utf-8");

                        tools.transformCSSForDevelopment(result.css.toString()).then(function (result) {
                            res.send(result.css);
                        });
                    }
                });
            }
        );
    });

    // 代理设置
    for (var key in config.proxy) {
        var proxy = config.proxy[key];
        var httpRE = /^(https?\:)\/\/([^:\/]+)(?:\:(\d+))?(?:(\/[^?#]*)(\?.+)?(#.+)?)?/;

        if (httpRE.test(proxy)) {
            var protocol = RegExp.$1;
            var host = RegExp.$2;
            var port = RegExp.$3 ? parseInt(RegExp.$3) : 80;

            console.log("proxy:", host, port);

            app.all(key, httpProxy(host, port));
        } else {
            console.log("file proxy:", proxy);
            app.use(key, express.static(absolutePath(proxy)));
        }
    }

    console.log("start with", config.port, process.argv);

    app.listen(config.port);
}

var argv = process.argv;
var args = {};

for (var i = 2, arg, length = argv.length; i < length; i++) {
    arg = argv[i];

    arg.replace(/--([^=]+)(?:\=(\S+)){0,1}/, function (match, key, value) {
        args[key] = value == undefined ? true : (/^(true|false|-?\d+)$/.test(value) ? eval(value) : value);
        return '';
    });
}

//打包
if (args.build) {

    exports.loadConfig(function (config) {
        console.log("start:", formatDate(new Date()));

        _.extend(config, config.env[args.build === true ? 'production' : args.build], {
            debug: false
        });

        var absoluteBaseDir = absolutePath('./');
        var absoluteDestDir = absolutePath(config.dest);

        //打包框架
        tools.combineJS(absoluteBaseDir, absoluteDestDir, {
            "snowball": config.framework
        });

        //合并js
        config.resourceMapping = tools.combineJS(absoluteBaseDir, absoluteDestDir, config.js);

        //生成首页
        createIndex(config, function (err, html) {
            tools.minifyHTML(html).then(function (res) {
                tools.save(path.join(absoluteDestDir, 'index.html'), res);
            })
        });

        //打包业务代码
        config.projects.forEach(function (project) {
            var requires = [];
            var excludes = [];

            var pachJs = function (key, fileList, resourceMapping) {
                var ids;
                if (!_.isArray(fileList)) {
                    ids = _.keys(fileList);
                    fileList = _.map(fileList, function (value, id) {
                        return value || id;
                    });
                }

                Promise.all(fileList.map(function (file, i) {
                    var isRazorTpl = /\.(html|tpl|cshtml)$/.test(file);

                    return new Promise(function (resolve) {
                        fsc.readFirstExistentFile([project.root], isRazorTpl ? [file] : [file + '.js', file + '.jsx'], function (err, text, fileName) {
                            var moduleId = ids ? ids[i] : getModuleId(project.root, file);

                            resourceMapping.push(moduleId);

                            if (isRazorTpl) text = razor.web(text);
                            text = transformSnowballJS(moduleId, text);
                            text = tools.minifyJS(text);

                            resolve(text);
                        });
                    })
                })).then(function (results) {
                    tools.save(path.join(absoluteDestDir, project.root, key + '.js'), results.join(''));
                });
            }

            //打包项目引用js
            for (var key in project.js) {
                var combinedJs = getModuleId(project.root, key);
                var resourceMapping = config.resourceMapping[combinedJs] = [];
                var jsMap = project.js[key];
                var tmp;

                if (typeof jsMap == 'string') {
                    (tmp = {})[key] = jsMap;
                    jsMap = tmp;
                }

                pachJs(key, jsMap, resourceMapping);
            }

            function packCSS(key, fileList) {
                Promise.all(fileList.map(function (file) {
                    return new Promise(function (resolve) {
                        fsc.firstExistentFile([absolutePath(project.root, file), absolutePath(project.root, file).replace(/\.css$/, '.scss')], function (file) {
                            if (/\.css$/.test(file)) {
                                fs.readFile(file, 'utf-8', function (err, text) {
                                    tools.minifyCSS(text).then(function (result) {
                                        resolve(result.css);
                                    });
                                });
                            } else {
                                sass.render({
                                    // outputStyle: 'compressed',
                                    file: file
                                }, function (err, result) {
                                    tools.minifyCSS(result.css.toString()).then(function (result) {
                                        resolve(result.css);
                                    });
                                });
                            }
                        });
                    });

                })).then(function (results) {
                    tools.save(path.join(absoluteDestDir, project.root, key), results.join(''));
                });
            }

            //打包项目引用css
            for (var key in project.css) {
                requires.push(getModuleId(project.root, key));
                if (project.css[key] && project.css[key].length) {
                    packCSS(key, project.css[key]);
                }
            }

            //打包template和controller
            excludes = excludes.concat(Object.keys(config.framework))
                .concat(['animation', '$', 'zepto', 'activity']);

            var contains = [];

            function packBusinessFromRouter(template, controller) {
                var controllerPath = path.join(absoluteBaseDir, controller);
                var templatePath = path.join(absoluteBaseDir, template);
                var codes = '';

                return new Promise(function (resolve) {
                    //打包模版
                    fsc.readFirstExistentFile([templatePath + '.html', templatePath + '.cshtml', templatePath + '.tpl'], function (err, text, fileName) {
                        if (!err && contains.indexOf(fileName) == -1) {
                            contains.push(fileName);
                            text = razor.web(text);
                            text = tools.minifyJS(transformSnowballJS(template, text));
                            codes += text;
                        }
                        console.log("打包模版", fileName);

                        resolve();
                    });
                }).then(function () {
                    return new Promise(function (resolve) {
                        //打包控制器
                        fsc.readFirstExistentFile([controllerPath + '.js', controllerPath + '.jsx'], function (err, text, fileName) {
                            if (!err && contains.indexOf(fileName) == -1) {
                                text = tools.minifyJS(transformSnowballJS(controller, text, requires, excludes));
                                codes += text;
                            }
                            console.log("打包控制器", fileName);
                            resolve(codes);
                        });
                    })
                });
            }

            var packingProcess = [];

            for (var key in project.route) {
                var router = project.route[key];
                var controller;
                var template;

                if (typeof router == 'string') {
                    controller = template = router;
                } else {
                    controller = router.controller;
                    template = router.template;
                }

                controller = getModuleId(project.root, 'views', controller);
                template = getModuleId(project.root, 'template', template);

                packingProcess.push(packBusinessFromRouter(template, controller));
            }

            //保存合并后的业务代码
            Promise.all(packingProcess).then(function (results) {
                console.log('保存合并后的业务代码');
                tools.save(path.join(absoluteDestDir, project.root, 'controller.js'), results.join(''));
            });
        });

        // 移动静态文件
        if (config.static) tools.moveDir(absoluteBaseDir, absoluteDestDir, config.static);

        //复制图片资源
        var resouceExt = '*.(jpg|gif|png|eot|svg|ttf|woff)';

        Promise.all(config.images.map(function (imgDir, i) {
            return new Promise(function (resolve, reject) {
                fsc.copy(path.join(absoluteBaseDir, imgDir), absolutePath(config.dest, 'images'), resouceExt, function (err, result) {
                    resolve(result);
                });
            });
        })).then(function () {
            config.projects.forEach(function (proj) {
                if (proj.images) {
                    proj.images.forEach(function (imgDir) {
                        fsc.copy(absolutePath(proj.root, imgDir), absolutePath(config.dest, proj.root, 'images'), resouceExt, function (err, result) { });
                    });
                }
            });
        }).then(function () {
            console.log('copy resources success');
        });
    });

} else {
    exports.loadConfig(function (config) {
        exports.startWebServer(config);
    });
}