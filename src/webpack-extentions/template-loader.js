module.exports = function (source, inputSourceMap) {
    this.cacheable();

    source = 'module.exports=' + JSON.stringify(source);
    this.callback(null, source, inputSourceMap);
};