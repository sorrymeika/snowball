var util = require('./util');

var passed = 0;
var failures = 0;

function eql(a, b, descripe) {
    var result = util.equals(a, b);

    if (!result) {
        failures++;
        console.error('[FAIL]', descripe || '', a, '!=', b);

    } else {
        passed++;
    }
}

function testcase(descripe, fn) {
    passed = 0;
    failures = 0;

    fn();

    console.log('%c ' + failures + ' tests failed %c ' + passed + ' tests passed [' + descripe + '] ', failures > 0 ? 'background-color:#c00;color:#fff' : 'color:#999', 'color:green');
}

testcase("test util.joinPath", function () {
    eql(util.joinPath("abc/dd", "../"), "abc");
    eql(util.joinPath("/abc/dd", "aa"), "/abc/dd/aa");
    eql(util.joinPath("/abc/dd", "./../aa"), "/abc/aa");
    eql(util.joinPath("/abc/dd", "../../aa"), "/aa");
    eql(util.joinPath("/abc/dd/a.js", "./aa"), "/abc/dd/a.js/aa");
});


module.exports = {
    testcase: testcase,
    eql: eql
}