/* eslint-disable line-comment-position */
export function stringToUint8Array(string) {
    let pos = 0;
    const len = string.length;

    let at = 0; // output position
    let tlen = Math.max(32, len + (len >> 1) + 7); // 1.5x size
    let target = new Uint8Array((tlen >> 3) << 3); // ... but at 8 byte offset

    while (pos < len) {
        let value = string.charCodeAt(pos++);
        if (value >= 0xd800 && value <= 0xdbff) {
            // high surrogate
            if (pos < len) {
                const extra = string.charCodeAt(pos);
                if ((extra & 0xfc00) === 0xdc00) {
                    ++pos;
                    value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                }
            }
            if (value >= 0xd800 && value <= 0xdbff) {
                continue; // drop lone surrogate
            }
        }

        // expand the buffer if we couldn't write 4 bytes
        if (at + 4 > target.length) {
            tlen += 8; // minimum extra
            tlen *= (1.0 + (pos / string.length) * 2); // take 2x the remaining
            tlen = (tlen >> 3) << 3; // 8 byte offset

            const update = new Uint8Array(tlen);
            update.set(target);
            target = update;
        }

        if ((value & 0xffffff80) === 0) { // 1-byte
            target[at++] = value; // ASCII
            continue;
        } else if ((value & 0xfffff800) === 0) { // 2-byte
            target[at++] = ((value >> 6) & 0x1f) | 0xc0;
        } else if ((value & 0xffff0000) === 0) { // 3-byte
            target[at++] = ((value >> 12) & 0x0f) | 0xe0;
            target[at++] = ((value >> 6) & 0x3f) | 0x80;
        } else if ((value & 0xffe00000) === 0) { // 4-byte
            target[at++] = ((value >> 18) & 0x07) | 0xf0;
            target[at++] = ((value >> 12) & 0x3f) | 0x80;
            target[at++] = ((value >> 6) & 0x3f) | 0x80;
        } else {
            // FIXME: do we care
            continue;
        }

        target[at++] = (value & 0x3f) | 0x80;
    }

    return target.slice(0, at);
}

export function utf8ArrayToString(array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len) {
        c = array[i++];
        switch (c >> 4) {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12: case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }

    return out;
}

export function largeUint8ArrayToString(uint8arr, callback) {
    var bb = new Blob([uint8arr]);
    var f = new FileReader();
    f.onload = function (e) {
        callback(e.target);
    };
    f.readAsText(bb);
}