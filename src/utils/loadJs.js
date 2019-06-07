var doc = document;
var head = doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement;
var baseElement = head.getElementsByTagName("base")[0];

const urlCache = {};

export async function loadJsInQueue(urls, options) {
    for (var i = 0; i < urls.length; i++) {
        await loadJs(urls[i], options);
    }
}

export function loadJs(url, options) {
    if (Array.isArray(url)) {
        return Promise.all(url.map(_url => loadJs(_url, options)));
    }
    if (/^\/\//.test(url)) {
        url = location.protocol + url;
    }
    if (urlCache[url]) {
        return urlCache[url];
    }
    return urlCache[url] = new Promise((resolve, reject) => {
        var id = options && options.id;
        var node = id ? document.getElementById(id) : null;
        if (!node) {
            node = Array.prototype.find.call(doc.querySelectorAll('script'), (script) => script.src == url);
        }
        if (node) {
            resolve();
            return;
        }
        node = doc.createElement("script");

        if (id) node.id = id;
        if (options) {
            if (options.charset) {
                node.charset = options.charset;
            }
            if (options.crossorigin !== undefined) {
                node.setAttribute("crossorigin", options.crossorigin);
            }
        }

        addOnload(node, resolve, reject, url);

        node.async = true;
        node.src = url;

        baseElement ?
            head.insertBefore(node, baseElement) :
            head.appendChild(node);
    });
}

function addOnload(node, resolve, reject, url) {
    var supportOnload = "onload" in node;

    if (supportOnload) {
        node.onload = success;
        node.onerror = function () {
            onload();
            reject(`load js ${url} failure`);
        };
    } else {
        node.onreadystatechange = function () {
            if (/loaded|complete/.test(node.readyState)) {
                success();
            }
        };
    }

    function success() {
        onload();
        resolve();
    }

    function onload() {
        node.onload = node.onerror = node.onreadystatechange = null;
        node = null;
    }
}