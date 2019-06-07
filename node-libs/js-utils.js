
var UglifyJS = require('uglify-js');
var babel = require('babel-core');

function replaceBOM(text) {
    return text.replace(/^\uFEFF/i, '');
}

exports.minify = function minify(code, mangle_names) {
    code = replaceBOM(code).replace(/\/\/<--debug[\s\S]+?\/\/debug-->/img, '');

    var result = UglifyJS.minify(code, {
        compress: {
            sequences: true, // join consecutive statemets with the “comma operator”
            properties: true, // optimize property access: a["foo"] → a.foo
            dead_code: true, // discard unreachable code
            drop_debugger: true, // discard “debugger” statements
            unsafe: false, // some unsafe optimizations (see below)
            conditionals: true, // optimize if-s and conditional expressions
            comparisons: true, // optimize comparisons
            evaluate: true, // evaluate constant expressions
            booleans: true, // optimize boolean expressions
            loops: true, // optimize loops
            unused: true, // drop unused variables/functions
            hoist_funs: true, // hoist function declarations
            hoist_vars: false, // hoist variable declarations
            if_return: true, // optimize if-s followed by return/continue
            join_vars: true, // join var declarations
            cascade: true, // try to cascade `right` into `left` in sequences
            side_effects: true, // drop side-effect-free statements
            warnings: false, // warn about potentially dangerous optimizations/code
            global_defs: {}
        }
    });
    if (result.error) {
        throw new Error(result.error);
    }
    return result.code;
};


exports.toES5 = function toES5(script) {
    script = babel.transform(script, {
        presets: ['react-app'],
        plugins: [
            "syntax-async-functions",
            "transform-async-to-generator",
            "transform-decorators-legacy",
            ["transform-es2015-modules-commonjs", {
                "allowTopLevelThis": true
            }]
        ]
    });
    return script.code;
};