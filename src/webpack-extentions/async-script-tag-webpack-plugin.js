function AsyncJSPlugin(opts) {
}

AsyncJSPlugin.prototype.apply = function (compiler) {
    compiler.plugin('compilation', (_compilation) => {
        _compilation.plugin('html-webpack-plugin-after-html-processing', function (data, callback) {
            data.html = data.html.replace(/<script type="text\/javascript" src=".\/static\/js\/main\.(\w+)\.js"><\/script>/, (match, version) => {
                return `<script async type="text/javascript" src="./static/js/main.${version}.js"></script>`;
            });
            callback(null, data);
        });
    });
};

module.exports = AsyncJSPlugin;
