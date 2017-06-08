
function trim(hash) {

    var searchIndex = hash.indexOf('?');
    var search = '';
    if (searchIndex != -1) {
        search = hash.substr(searchIndex);
        hash = hash.substr(0, searchIndex);
    }

    return (hash.replace(/^#+|\/$/g, '') || '/') + search;
}

function URL(url) {
    var search;
    var path;
    var query = {};

    var uri = {};

    if (/(?:^(https?\:)\/\/([^:\/]+)(?:\:(\d+))?)?(?:(\/[^?#]*)(\?.+)?(#.+)?)?/.test(url)) {
        uri.protocol = RegExp.$1 || location.protocol;
        uri.host = RegExp.$2;
        uri.port = RegExp.$3 ? parseInt(RegExp.$3) : 80;

        path = RegExp.$4;
        search = RegExp.$5;
        uri.hash = RegExp.$6;

        if (path) {
            path = path.replace(/\/$/, '') || '/';
        }

        if (search) {
            search.replace(/(?:^\?|&)([^=&]+)=([^&]*)/g, function (r0, r1, r2) {
                query[r1] = decodeURIComponent(r2);
                return '';
            });
        }

        uri.path = path;
        uri.search = search;
        uri.query = query;
    }

    this.uri = uri;
}

URL.prototype.protocol = function () {
    return this.uri.protocol;
}

URL.prototype.host = function () {
    return this.uri.host;
}

URL.prototype.path = function () {
    return this.uri.path;
}

URL.prototype.query = function () {
    return this.uri.query;
}

URL.prototype.search = function () {
    return this.uri.search;
}

URL.prototype.toURI = function () {
    return Object.assign({}, this.uri);
}

URL.prototype.equal = function (url) {
    return url + '' === this.toString();
}

URL.prototype.toString = function () {
    var uri = this.uri;

    if (uri.host) {
        return uri.protocol + '//' + uri.host + (uri.port == 80 ? '' : (':' + uri.port)) + uri.path + uri.search;
    }
    return uri.path + uri.search;
}


URL.from = function (url) {
    if (url) {
        url = url.replace(/^#+/g, '')
    }

    return new URL(url);
}


URL.isEqual = function (a, b) {
    return trim(a + '') == trim(b + '');
}

URL.trim = trim;

URL.getPath = function (url) {
    return url ? url.replace(/^https?:\/\/[^\/]+|\?.*$/g, '').toLowerCase() : null;
};

module.exports = URL;