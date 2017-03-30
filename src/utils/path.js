
var path = {

    join: function () {
        var args = [].slice.apply(arguments);
        var result = args.join('/').replace(/[\\]+/g, '/').replace(/([^\:\/]|^)[\/]{2,}/g, '$1/').replace(/([^\.]|^)\.\//g, '$1');
        var flag = true;
        while (flag) {
            flag = false;
            result = result.replace(/([^\/]+)\/\.\.(\/|$)/g, function (match, name) {
                if (name == '..') return match;
                if (!flag) flag = true;
                return '';
            })
        }
        return result.replace(/\/$/, '');
    },

    dir: function (pathStr) {
        var index = pathStr.lastIndexOf('/');
        return index == -1 ? pathStr : pathStr.substr(0, index);
    }
}

module.exports = path;