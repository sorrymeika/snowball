define(function (require, exports, module) {

    function CubicBezier(mX1, mY1, mX2, mY2) {
        var m;
        if (typeof mX1 == 'string') {
            m = mX1.replace('cubic-bezier(', '').replace(')', '').split(',');
            mX1 = +m[0];
            mY1 = +m[1];
            mX2 = +m[2];
            mY2 = +m[3];
        }

        var _this = this;
        var _preCalculatedPercents = [];

        this.get = function (aX) {
            if (mX1 == mY1 && mX2 == mY2) return aX; // linear
            return CalcBezier(GetTForX(aX), mY1, mY2);
        }

        this.getPreCalculated = function (p) {
            return _preCalculatedPercents[(p * 1000) | 0];
        }

        this.getPreCalculated2 = function (p) {
            return _preCalculatedPercents[p];
        }

        function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
        function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
        function C(aA1) { return 3.0 * aA1; }

        // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
        function CalcBezier(aT, aA1, aA2) {
            return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
        }

        // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
        function GetSlope(aT, aA1, aA2) {
            return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
        }

        function GetTForX(aX) {
            // Newton raphson iteration
            var aGuessT = aX;
            for (var i = 0; i < 4; ++i) {
                var currentSlope = GetSlope(aGuessT, mX1, mX2);
                if (currentSlope == 0.0) return aGuessT;
                var currentX = CalcBezier(aGuessT, mX1, mX2) - aX;
                aGuessT -= currentX / currentSlope;
            }
            return aGuessT;
        }

        function preCalculate() {
            for (var i = 0; i < 1000; i += 1)
                _preCalculatedPercents.push(_this.get(i / 1000));
        }

        preCalculate();
    }

    var _cb = new CubicBezier(.02, .64, .07, .97);

    module.exports = CubicBezier;
});
