var fs = require('fs');
var path = require('path');
var fse = require('fs-extra');

var walk = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};
exports.walk = walk;

var find = function (dir, rpath, done) {
    if (typeof rpath === 'string') {
        rpath = new RegExp(rpath.replace(/\./g, '\\.').replace(/\*/g, '.+?'));
    }

    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    find(file, rpath, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    if (rpath.test(file)) results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};
exports.find = find;

var serialWalk = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            file = dir + '/' + file;
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    serialWalk(file, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    results.push(file);
                    next();
                }
            });
        })();
    });
};
exports.serialWalk = serialWalk;

var copy = function (src, dest, filter, done) {
    if (!done && typeof filter === 'function') {
        done = filter;
        filter = null;
    }
    if (!filter) fse.copy(src, dest, done);
    else {
        var fullSrc = path.resolve(src);

        find(src, filter, function (err, results) {
            if (err) return done(err);

            var pending = results.length;
            if (!pending) return done(null, results);

            results.forEach(function (item) {
                fse.copy(item, path.join(dest, item.replace(fullSrc, '')), function () {
                    if (!--pending) done(null, results);
                });
            });
        });
    }
};
exports.copy = copy;

var firstExistentFile = function (paths, files, callback) {
    if (typeof files == 'function') {
        callback = files, files = null;
    }
    if (typeof paths == 'string') {
        paths = [paths];
    }
    var reads;
    if (files) {
        if (typeof files == 'string') {
            files = [files];
        }
        reads = [];
        for (var i = 0; i < paths.length; i++) {
            for (var j = 0; j < files.length; j++) {
                reads.push(path.join(paths[i], files[j]));
            }
        }
    } else {
        reads = paths;
    }

    var count = 0;
    (function () {
        var fn = arguments.callee;
        if (count < reads.length) {
            var file = reads[count];
            fs.exists(file, function (exists) {
                if (exists) {
                    callback(file);
                } else {
                    count++;
                    fn();
                }
            });

        } else {
            callback(null);
        }
    })();
};
exports.firstExistentFile = firstExistentFile;

exports.readFirstExistentFile = function (paths, files, callback) {
    if (typeof files == 'function') {
        callback = files;
        files = null;
    }
    firstExistentFile(paths, files, function (file) {
        if (!file) {
            callback('all files are not exists', null, null);

        } else {
            fs.readFile(file, { encoding: 'utf-8' }, function (err, result) {
                callback(err, result, file);
            });
        }
    });
};


exports.mkdirs = fse.mkdirs;