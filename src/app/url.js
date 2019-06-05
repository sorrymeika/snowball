
export function trim(hash) {
    var searchIndex = hash.indexOf('?');
    var search = '';
    if (searchIndex != -1) {
        search = hash.substr(searchIndex);
        hash = hash.substr(0, searchIndex);
    }
    return (hash.replace(/^#+|\/$/g, '') || '/') + search;
}

export function isEqual(a, b) {
    return trim(a + '') == trim(b + '');
}

export function getPath(a, b) {
    return trim(a + '') == trim(b + '');
}

export default class URL {
    static from(url) {
        if (url) {
            url = url.replace(/^#+/g, '');
        }
        return new URL(url);
    }

    constructor(url) {
        var search;
        var path;
        var query = {};
        var uri = {};

        if (/(?:^(https?:)\/\/([^:\/]+)(?:\:(\d+))?)?(?:(\/[^?#]*)(\?.+)?(#.+)?)?/.test(url)) {
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

    get protocol() {
        return this.uri.protocol;
    }

    get host() {
        return this.uri.host;
    }

    get path() {
        return this.uri.path;
    }

    get query() {
        return this.uri.query;
    }

    get search() {
        return this.uri.search;
    }

    equals(url) {
        return url + '' === this.toString();
    }

    toURI() {
        return Object.assign({}, this.uri);
    }

    toString() {
        var uri = this.uri;

        if (uri.host) {
            return uri.protocol + '//' + uri.host + (uri.port == 80 ? '' : (':' + uri.port)) + uri.path + uri.search;
        }
        return uri.path + uri.search;
    }
}

