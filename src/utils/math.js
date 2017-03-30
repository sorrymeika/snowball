var math = {
    /**
     * 排列组合公式 - 组合数公式
     * @returns {Number} 总共有多少种组合
     * 
     * @example
     * 两球放到三个盒子中 math.C(2,3)
     */
    C: function (n, m) {
        var a = 1, b = 1;
        for (var i = n; i > n - m; i--) {
            a *= i;
        }
        for (var i = 1; i <= m; i++) {
            b *= i;
        }
        return a / b;
    },

    /**
     * 排列组合公式 - 排列数公式
     * @returns {Number} 总共有多少种组合
     * 
     * @example
     * 五个球随机取两个球 math.A(5,2)
     */
    A: function (n, m) {
        var a = 1;
        for (var i = n; i > n - m; i--) {
            a *= i;
        }
        return a;
    }
};

module.exports = math;