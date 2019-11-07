/**
 * 作者: sunlu
 * 用途: 预加载快照、数据和模版
 * 开发前必读:
 * 该js不使用babel转译，必须使用es5编写
 * 该js中 `somewords` 是会被PreloadPlugin替换的，字符串必须用'或"包裹
 */

// localStorage.clear();
window.preloader = (function (window, document, preloadOptions, undefined) {
    var ua = navigator.userAgent;
    var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
    var PLATFORM = /(Android);?[\s/]+([\d.]+)?/i.test(ua)
        ? "android"
        : /(iPhone|iPad|iPod).*OS\s([\d_]+)/i.test(ua)
            ? 'iOS'
            : /(MSIE) (\d+)/i.test(ua)
                ? 'ie'
                : /Chrome\/(\d+)/i.test(ua)
                    ? 'chrome'
                    : 'unknow';
    var ov = RegExp.$2 ? RegExp.$2.split(/_|\./) : [0, 0];
    var osVersion = parseFloat(ov[0] + '.' + ov[1]);
    var iOS = PLATFORM === 'iOS';
    var isAndroid = PLATFORM === 'android';
    var IS_SNOWBALL_WEBVIEW = /snowball/i.test(ua);

    (function initialize(initializers) {
        console.time("Start React App spend");

        window.addEventListener('pageshow', function (e) {
            if (e.persisted) {
                window.location.reload(true);
            }
        });

        initializers.forEach(function (init) {
            init();
        });
    })([
        /**
         * 设置1rem等于100px
         */
        function resetRem() {
            function refreshRem() {
                var docEl = document.documentElement;
                var screenWidth = Math.min(screen.width, window.innerWidth, docEl.getBoundingClientRect().width);
                var rem = preloadOptions.mobile ? Math.min(screenWidth, 414) * 100 / 375 || 100 : 100;
                window.pixelWidth = screenWidth * window.devicePixelRatio;

                docEl.style.fontSize = rem + 'px';

                var realitySize = parseInt(window.getComputedStyle(docEl).fontSize, 10);
                if (rem !== realitySize) {
                    rem = rem * rem / realitySize;
                    docEl.style.fontSize = rem + 'px';
                }
            }
            refreshRem();

            var tid;
            window.addEventListener('resize', function () {
                clearTimeout(tid);
                tid = setTimeout(refreshRem, 300);
            }, false);
        },
        /**
         * 增加一些css hack，可针对不同平台做不同的展示
         */
        function addCssHack() {
            function addBodyClass(className) {
                document.body.classList.add(className);
            }
            if (isAndroid) {
                addBodyClass('app-android');
                if (osVersion <= 4.3) {
                    addBodyClass('app-android-lte4_3');
                }
            } else {
                addBodyClass('app-ios');
                if (IS_SNOWBALL_WEBVIEW) {
                    addBodyClass('app-fix-statusbar');
                }
            }

            function refreshCssHack() {
                newStyle(
                    'cssHack',
                    '.app-screen-width,.w_100vw{width:' + window.innerWidth + 'px}' +
                    '.app-screen-height,h_100vh{height:' + window.innerHeight + 'px}' +
                    '.mh_100vh{min-height:' + window.innerHeight + 'px}'
                );
            }

            var timeoutId;
            window.addEventListener('resize', function () {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(refreshCssHack, 300);
            }, false);
            refreshCssHack();
        }
    ]);

    function newStyle(styleId, cssText) {
        if (document.getElementById(styleId)) {
            return;
        }
        var style = document.createElement("style");
        style.id = styleId;
        style.type = "text/css";
        try {
            style.appendChild(document.createTextNode(cssText));
        } catch (ex) {
            style.styleSheet.cssText = cssText;
        }
        head.appendChild(style);
    }

    function ajax(params) {
        var url = params.url,
            method = params.method || 'GET',
            data = params.data || null,
            beforeSend = params.beforeSend,
            success = params.success,
            error = params.error;

        if (!url) return;
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', function () {
            success(xhr.responseText, xhr);
        });
        error && xhr.addEventListener('error', error);

        xhr.open(method, url, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");

        beforeSend && beforeSend(xhr);

        xhr.send(data);
    }

    var getManifest = (function () {
        var manifest = {};
        // 预加载 `{subproject}/asset-manifest.json`
        function preloadManifest(url) {
            ajax({
                url,
                beforeSend(xhr) {
                    xhr.setRequestHeader('Cache-Control', 'no-cache');
                },
                success(res) {
                    manifest[url] = JSON.parse(res);
                }
            });
        }

        var projects = preloadOptions.projects;
        for (var i = 0; i < projects.length; i++) {
            preloadManifest(projects[i]);
        }

        return function (url) {
            return manifest[url];
        };
    })();

    return {
        ajax,
        getManifest
    };
})(window, document, `preloadOptions`);