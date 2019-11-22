var fs = require('fs');
var JsUtils = require('../../../node-libs/js-utils');

function createPreloaderJS(options) {
    var preloader = fs.readFileSync(options.preloader, 'utf8');

    preloader = preloader
        .replace('`preloadOptions`', JSON.stringify({
            mobile: options.mobile,
            bundles: options.bundles,
            bundleLevel: options.bundleLevel,
            projects: options.projects
        }))
        .replace(/\bprocess\.env\.NODE_ENV\s?===?\s?('|")PRELOAD\1/g, 'true')
        .replace(/('|")PRELOAD\1\s?===?\s?process\.env\.NODE_ENV/g, 'true')
        .replace(/\bprocess\.env\.NODE_ENV\s?!==?\s?('|")PRELOAD\1/g, 'false')
        .replace(/('|")PRELOAD\1\s?!==?\s?process\.env\.NODE_ENV/g, 'false');

    return process.env.NODE_ENV === 'production'
        ? JsUtils.minify(JsUtils.toES5(preloader))
        : preloader;
}

var config = {};
var debugPreloader = false;

/**
 * html骨架+预渲染插件
 * @param {Object} options 配置
 * @param {Object} options.skeleton 骨架路由配置，如: { '/home': HomeComponent, '/product/:id': ProductComponent }
 * @param {String} options.appSrc 应用src文件夹地址
 * @param {String} options.preloader preloader js模版的路径
 * @param {String} [options.bundleLevel="low"] bundle js加载优先级, `high`表示和图片等资源一同加载，否则等图片等资源加载完成再加载
 * @param {String[]} options.projects 需要预加载的子项目
 */
function HtmlPreRenderWebpackPlugin(options) {
    this.options = options;

    config.projects = options.projects || [];
    config.skeletonConfig = options.skeleton;
    config.appSrc = options.appSrc;
    config.preloader = options.preloader;
    config.mobile = options.mobile !== false;
}

HtmlPreRenderWebpackPlugin.debugPreloader = function () {
    debugPreloader = true;
    return function (req, res, next) {
        if (req.path === '/__PRELOADER_AND_SKELETON__.js') {
            res.send(createPreloaderJS(config));
        } else {
            next();
        }
    };
};

HtmlPreRenderWebpackPlugin.prototype.apply = function (compiler) {
    var self = this;

    compiler.plugin('emit', (compilation, callback) => {
        var asset = compilation.assets['index.html'];
        if (asset) {
            var html = asset.source();
            var bundleLevel = self.options.bundleLevel;
            var replaceOnce = '%__PRELOADER_AND_SKELETON__%';
            config.bundleLevel = bundleLevel;
            config.bundles = {};

            html = html
                .replace(/<script (?:type="text\/javascript"\s+)?src="([^"]*(?:static\/js\/(bundle|main|vendors)[\w~.]*\.js))"><\/script>/g, (match, bundleJS, bundleName) => {
                    var replacement = replaceOnce;
                    replaceOnce = '';
                    if (bundleLevel !== 'low') {
                        replacement += match;
                    }
                    config.bundles[bundleName] = bundleJS;
                    return replacement;
                })
                .replace('%__PRELOADER_AND_SKELETON__%', function () {
                    if (debugPreloader) {
                        return '<script type="text/javascript" src="__PRELOADER_AND_SKELETON__.js"></script>';
                    } else {
                        return '<script>' + createPreloaderJS(config) + '</script>';
                    }
                });

            compilation.assets['index.html'] = {
                source: function () {
                    return html;
                },
                size: function () {
                    return html.length;
                }
            };
        }

        callback();
    });
};

module.exports = HtmlPreRenderWebpackPlugin;
