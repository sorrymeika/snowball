export function random(min, max) {
    if (max == null) {
        max = min;
        min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * 获取圆上的点坐标
 *
 * @param {number} x0 原点x
 * @param {number} y0 原点y
 * @param {number} r 半径
 * @param {number} a 角度
 */
export function pointOnCircle(x0, y0, r, a) {
    return {
        x: x0 + r * Math.cos(a * Math.PI / 180),
        y: y0 + r * Math.sin(a * Math.PI / 180)
    };
}

export function fixFloat(f) {
    return Math.round((typeof f === 'number' ? f : parseFloat(f || 0)) * 100) / 100;
}
