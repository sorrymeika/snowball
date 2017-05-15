var http = require('http');

//app.all('*', httpProxy('m.abs.cn', 7788));
//app.all('*', httpProxy('localhost', 6004));
//app.all('*', httpProxy('192.168.0.106', 6004));

module.exports = function (host, port, replace) {
    return function (request, response) {
        var url = replace
            ? replace(request.url)
            : (
                (request.params[0].indexOf('/') !== 0 ? '/' + request.params[0] : request.params[0])
                + (request.url.indexOf('?') == -1 ? '' : request.url.substr(request.url.indexOf('?')))
            );

        var options = {
            hostname: host,
            port: port,
            path: url,
            method: request.method,
            headers: Object.assign({}, request.headers, { host: host + ":" + port })
        };

        var isDebug = false;
        var log = isDebug ? console.log : function () { }

        log(url, options);

        var req = http.request(options, function (res) {
            log(request.headers.origin);
            var cookies = res.headers['set-cookie'];

            if (cookies != false) {
                cookies.forEach(function (cookie, i) {
                    cookies[i] = cookie.replace(/Domain=[^;]+;/, 'Domain=' + request.hostname + ';')
                });
            }

            response.set(res.headers);
            //response.set('Access-Control-Allow-Credentials', true);
            response.set('Access-Control-Allow-Origin', request.headers.origin || '*');

            res.on('data', function (chunk) {
                log(2);
                response.write(chunk);
            });

            res.on('end', function () {
                log(3);
                response.end();
            });
        });

        req.on('error', function (e) {
            log(e);
            response.end();
        });

        request.on('data', function (postData) {
            log(4);
            req.write(postData);
        });

        request.on('end', function () {
            log(5);
            req.end();
        });

    };
}