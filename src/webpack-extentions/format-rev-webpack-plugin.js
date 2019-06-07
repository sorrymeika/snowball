const fs = require('fs');
const crypto = require('crypto');

function toMd5(text) {
    return crypto.createHash('md5')
        .update(text)
        .digest('hex');
}

function FormatRevPlugin(opts) {
    const version = fs.readFileSync(opts.versionFileName, 'utf-8');
    this.version = version.replace(/\r|\n/ig, '');
    this.url = opts.url;
    this.fileName = opts.fileName;
    this.projectName = opts.projectName;
    this.appName = opts.appName || ['pajk'];
    this.externalFiles = opts.externalFiles || [];
}

FormatRevPlugin.prototype.apply = function (compiler) {
    // var html = "";

    compiler.plugin('compilation', (_compilation) => {
        _compilation.plugin('html-webpack-plugin-after-html-processing', function (data, callback) {
            // html = data.html;
            callback(null, data);
        });
    });

    compiler.plugin('emit', (compilation, compileCallback) => {
        const assets = compilation.assets;
        const origAsset = assets['asset-manifest.json'];
        const origObj = JSON.parse(origAsset.source());
        const lists = [];

        Object.keys(origObj).forEach(function (key) {
            var fileName = origObj[key];
            if (assets[fileName] && !fileName.endsWith('.map')) {
                lists.push({
                    name: key.substring(key.lastIndexOf('/') + 1),
                    url: fileName,
                    md5: toMd5(assets[fileName].source())
                });
            }
        });

        // remove index.html 缓存
        // lists.push({
        //     name: "index.html",
        //     url: "index.html",
        //     md5: html ? toMd5(html) : 'index'
        // });

        this.externalFiles.forEach(function (fullName) {
            const fileName = fullName.substr(fullName.lastIndexOf('/') + 1);
            lists.push({
                name: fileName,
                url: fullName,
                md5: fileName
            });
        });

        console.log(JSON.stringify(lists));

        var manifest = "CACHE MANIFEST\n"
            + '# ' + this.version.trim() + ' ' + Date.now() + '\n'
            + lists.map(item => item.url).join('\n')
            + '\n\n'
            + 'NETWORK:\n'
            + '*';
        compilation.assets["manifest.appcache"] = {
            source: function () {
                return manifest;
            },
            size: function () {
                return manifest.length;
            }
        };

        const destObj = {
            lists,
            version: this.version.trim(),
            prefix: this.url,
            project_name: this.projectName,
            appName: this.appName
        };

        const destObjStr = JSON.stringify(destObj, null, 2);
        compilation.assets[this.fileName] = {
            source: function () {
                return destObjStr;
            },
            size: function () {
                return destObjStr.length;
            }
        };

        compileCallback();
    });
};

module.exports = FormatRevPlugin;
