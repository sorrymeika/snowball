var util = require('util');
var URL = require('./url');

function Route(options) {
    this.routes = [];
    this.append(options);
};

Route.prototype.append = function (options) {
    var option,
        parts,
        root,
        namedParam,
        regex;

    for (var key in options) {
        option = options[key];
        parts = [];

        //(?:\{[^\}]+?\}|[^\/]){0,}[^\}]*
        regex = '^(?:\/{0,1})' + key.replace(/(\/|^|\?)\{((?:\{.+?\}|[^\}])+)\}/g, function (match, first, param) {
            namedParam = param.split(':');

            if (namedParam.length > 1) {
                parts.push(namedParam.shift());
                param = namedParam.join(':');
            }
            return first + '(' + param + ')';

        }) + '$';

        if (typeof option === 'string')
            throw new Error('Route options error');

        root = option.root || './';

        this.routes.push({
            regex: new RegExp(regex, 'i'),
            parts: parts,
            template: util.joinPath(root, option.template),
            view: util.joinPath(root, option.controller),
            api: option.api,
            root: root
        });
    }
}

Route.prototype.match = function (urlString) {
    var result = null,
        routes = this.routes,
        route,
        match;

    var url = URL.from(urlString);

    urlString = url + '';

    for (var i = 0, length = routes.length; i < length; i++) {
        route = routes[i];

        match = route.regex ? urlString.match(route.regex) : null;

        if (match) {

            result = Object.assign(url.toURI(), {
                url: urlString,
                hash: '#' + urlString,
                root: route.root,
                template: route.template,
                package: sl.isDebug ? false : util.joinPath(route.root, route.group || 'controller'),
                view: route.view,
                params: {},
                data: {}
            });

            for (var j = 0, len = route.parts.length; j < len; j++) {
                result.params[route.parts[j]] = match[j + 1];
            }

            if (route.api) {
                result.api = route.api.replace(/\{([^\}]+?)\}/g, function (match, key) {
                    return result.params[key];
                });
            }
            break;
        }
    }

    if (!result) {
        console.error('wrong url:', url);
    }

    return result;
}

module.exports = Route;