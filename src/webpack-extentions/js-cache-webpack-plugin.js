function JSCachePlugin(opts) {
}

JSCachePlugin.prototype.apply = function (compiler) {
    compiler.plugin('compilation', (_compilation) => {
        _compilation.plugin('html-webpack-plugin-after-html-processing', function (data, callback) {
            var html = data.html;
            html = html.replace(/<script type="text\/javascript" src=".\/static\/js\/main\.(\w+)\.js"><\/script>/, (match, version) => {
                return `var version = '${version}';
    var text = localStorage.getItem('main_script_cache');
    if (text && text.substr(0, version.length) == version) {
        var script = document.createElement('script');
        script.text = text.substr(version.length);
        window.onload=function(){
            new Function(script)();
        }
        return;
    }
    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var script = document.createElement('script');
            script.text = xhr.responseText;
            new Function(script)();
            localStorage.setItem('main_script_cache', version + xhr.responseText)
        }
    }
    xhr.open("GET", "./static/js/main." + version + ".js", true);
    xhr.send();`;
            });
            console.log(html);
            data.html = html;
            callback(null, data);
        });
    });
};

module.exports = JSCachePlugin;
