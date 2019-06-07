var http = require('http');
var https = require('https');

// app.all('*', httpProxy('m.abs.cn', 7788));
// app.all('*', httpProxy('localhost', 6004));
// app.all('*', httpProxy('192.168.0.106', 6004));

module.exports = function (host, port, replace) {
    return function (request, response) {
        var url = replace
            ? replace(request.url)
            : request.originalUrl;

        // console.log(request);
        console.log(host, port, url, request.method);

        var options = {
            hostname: host,
            port: port,
            path: url,
            method: request.method,
            headers: Object.assign({}, request.headers, {
                host: port == 80 || port == 443 ? host : (host + ":" + port),
                origin: (port == 443 ? 'https://' : "http://") + (host === 'dev.pajkdc.com' ? 'www.' + host : host)
            })
        };

        var isDebug = false;
        var log = isDebug ? console.log : function () { };

        log(options);

        var req = (port == 443 ? https : http).request(options, function (res) {
            var cookies = res.headers['set-cookie'];

            if (cookies) {
                cookies.forEach(function (cookie, i) {
                    cookies[i] = cookie.replace(/Domain=[^;]+;/, 'Domain=' + request.hostname + ';');
                });
            }
            // log(request);
            // log(res);

            if (res.headers.location) {
                res.headers.location = res.headers.location
                    .replace(host + ":" + port, request.headers.host || request.hostname)
                    .replace(host, request.headers.host || request.hostname);
            }

            res.headers['Access-Control-Allow-Origin'] = request.headers.origin || '*';
            res.headers['Access-Control-Allow-Credentials'] = true;

            response.writeHead(res.statusCode, res.statusMessage, res.headers);

            res.on('data', function (chunk) {
                // log(chunk.toString());
                response.write(chunk);
            });

            res.on('end', function () {
                log('response end');
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
};