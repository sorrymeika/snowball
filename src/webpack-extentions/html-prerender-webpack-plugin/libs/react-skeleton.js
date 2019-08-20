

var fs = require('fs');
var path = require('path');
var JsUtils = require('../../../node-libs/js-utils');

var stringRE = "'(?:(?:\\\\{2})+|\\\\'|[^'])*'|\"(?:(?:\\\\{2})+|\\\\\"|[^\"])*\"|`(?:(?:\\\\{2})+|\\\\`|[^`])*`";

function createRegExp(exp, flags, deep) {
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
            var parenthesisREStart = '\\' + pre + '(?:' + stringRE + '|';
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

var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^/\r\n])+\/(?=[^/])|\/\/.*|\.\s*require|(?:^|[^$])\bvar\s+([a-zA-Z0-9_]+)\s*=\s*require\s*\(\s*(["'])(.+?)\2\s*\)/g;
var USELESS_FN_RE = createRegExp("\\s(ref|on[A-Z]\\w+|app-link|app-track|app-track-params)={...}", 'g');

var route;
var mapPaths = function (item) {
    return !item ? '' : item.replace(/^(.*):([\w_]+)/, function (match, regex, id, end) {
        return '(' + (regex || '[^\\/]+') + ')';
    });
};

var modulesCache = {};
var refsIndex = 0;
var refs = {};

function getComponentCode(componentPath, appSrc) {
    componentPath = componentPath.startsWith('/') ?
        componentPath :
        path.join(appSrc, componentPath);

    console.log(componentPath);

    var code = modulesCache[componentPath];
    if (code !== undefined) {
        return code;
    }
    var requires = [];
    code = fs.readFileSync(componentPath, 'utf8');
    code = code.replace(USELESS_FN_RE, '');
    code = code.replace(/\bimport\s+\{([^\}]+)\}\s+from\s+(['"])mall-core\/components\2/g, (match, reqs) => {
        return reqs.split(',')
            .map(req => {
                req = req.trim();
                console.log(req);
                return 'import ' + req + ' from "mall-core/components/' + req + '";';
            })
            .join('');
    });

    code = JsUtils.toES5(code);
    code = code.replace(REQUIRE_RE, function (m, varName, q, requiredPath) {
        if (requiredPath) {
            var isMallCore = /^mall-core/.test(requiredPath);
            var fullPath = isMallCore
                ? path.join(process.cwd(), './node_modules', requiredPath + '.jsx')
                : path.resolve(componentPath.substr(0, componentPath.lastIndexOf('/')), requiredPath + '.jsx');
            if (/\/components\//.test(fullPath)) {
                requires.push({
                    varName: varName,
                    path: fullPath
                });
            }
            if (isMallCore) {
                return `var ${varName} = { env: {}, createPage: function(){return function(){}} }`;
            }
            return `var ${varName} = function(){return function(){}};${varName}.Component=function(){};`;
        }
        return m;
    });

    var fn = new Function("exports", code);
    var _exports = {};

    function nullCache() {
        modulesCache[componentPath] = null;
        return null;
    }

    try {
        fn(_exports);
    } catch (e) {
        console.error(code);
        console.error(e, componentPath);
        return nullCache();
    }

    var _default = _exports.__snapshot__ || _exports.default;

    if (_default.prototype.render) {
        code = _default.prototype.render.toString();

        code = code.replace(/\bthis\.props\b/g, '_Component_props');
        code = code.replace(/\bthis\.state\b/g, '_Component_state');

        code = code.replace(/^\s*function\s+render\(\)\s*{/, 'function render(_Component_props){var _Component_state={};');
    } else {
        code = _default.toString();
    }
    // console.log(code);
    // console.log(_exports);

    requires.forEach(function (req) {
        code = code.replace(new RegExp('\\.createElement\\(\\s*' + req.varName + '2\\.default\\b', 'mg'), function (m) {
            if (refs[req.path] === undefined) {
                if (!getComponentCode(req.path, appSrc)) {
                    return m;
                }
                refs[req.path] = refsIndex++;
            }
            return ".createElement(___components[" + refs[req.path] + "]";
        });
    });

    // 把不识别的components替换成div
    code = code.replace(new RegExp('\\.createElement\\(\\s*([a-zA-Z0-9\\._]+)(?=,)', 'mg'), function (m) {
        return ".createElement('div'";
    });

    code = code.replace(/\b__source:\s*\{[\s\S]+?\},/g, '')
        .replace(/\b__self: undefined,?/g, '')
        .replace(/\b_react2\.default\./g, '');

    modulesCache[componentPath] = code;
    return code;
}


/**
 * 生成骨架
 * @param {Object} routes 骨架路由，如: { '/home': HomeComponent, '/product/:id': ProductComponent }
 * @param {*} appSrc 应用路径
 */
exports.create = function create(routes, appSrc, mainjs) {
    var routeArr = [];
    var snapshots = '[';
    var ___components = [];

    if (process.env.NODE_ENV === 'production') {
        Object.keys(routes).forEach(function (key) {
            route = {
                path: key
            };
            var code = getComponentCode(routes[key] + ".jsx", appSrc);
            var maps = key.split('/').map(mapPaths);

            route.match = new RegExp("^" + maps.join('\\/') + "$");
            route.render = code;

            routeArr.push(route);
        });

        routeArr.forEach(function (route) {
            snapshots += `{ path:${JSON.stringify(route.path)},
    match: new RegExp(${JSON.stringify(route.match.source)}),
    render: ${route.render}
  },`;
        });

        Object.keys(refs).forEach(function (key) {
            ___components[refs[key]] = modulesCache[key];
        });
    }

    snapshots += ']';
    ___components = ___components.join(',');

    var skeletonTemplate = fs.readFileSync(path.join(__dirname, './skeleton.tmpl.js'), 'utf8');

    skeletonTemplate = skeletonTemplate.replace('`snapshots`', snapshots)
        .replace('`___components`', ___components);

    return skeletonTemplate;

    // console.log(routeArr);
    // console.log("snapshots", snapshots);
    // console.log("___components", ___components);
};