var id = 1;

export function identify() {
    return id++;
}

export function uuid() {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),
        uuid = '',
        rnd = 0,
        len = 36,
        r;
    for (var i = 0; i < len; i++) {
        if (i == 8 || i == 13 || i == 18 || i == 23) {
            uuid += '-';
        } else if (i == 14) {
            uuid += '4';
        } else {
            if (rnd <= 0x02) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
            r = rnd & 0xf;
            rnd >>= 4;
            uuid += chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
    }
    return uuid;
}