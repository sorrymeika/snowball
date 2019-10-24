import { pad } from "./format";

let offsetTime = 0;

export function setServerTime(serverTime) {
    offsetTime = Date.now() - serverTime;
}

export function getCurrentTime() {
    return Date.now() - offsetTime;
}

/**
 * 简单时间处理方法
 */

/**
 * @param {number} timestamp
 */
export function timeLeft(timestamp, type = "D") {
    const { days, hours, minutes, seconds } = splitTime(timestamp, type);
    return (!days ? '' : (days + '天 ')) +
        pad(hours) + ":" +
        pad(minutes) + ":" +
        pad(seconds);
}

export function splitTime(timestamp, type = "D") {
    var days = 0;
    if (type == 'D') {
        days = Math.floor(timestamp / (1000 * 60 * 60 * 24));
        timestamp %= (1000 * 60 * 60 * 24);
    }

    var hours = Math.floor(timestamp / (1000 * 60 * 60));
    timestamp %= (1000 * 60 * 60);

    var minutes = Math.floor(timestamp / (1000 * 60));
    timestamp %= (1000 * 60);

    var seconds = Math.floor(timestamp / 1000);
    timestamp %= (1000);

    return { days, hours, minutes, seconds };
}

/**
 * string 转 date
 *
 * @param {String} date
 * @return {Date}
 */
export function parseDate(date) {
    date = date.split(/\s+|:|-|年|月|日|\//).map(function (time) {
        return parseInt(time, 10);
    });

    return new Date(date[0], date[1] - 1, date[2], date[3], date[4], date[5]);
}

/**
 * date 转 string
 *
 * @param {Date|timestamp} d
 * @param {String} f 格式化字符串:yyyy-MM-dd HH:mm:ss_ffff | short | minutes
 * @return {Date}
 */
export function formatDate(d, f) {
    if (typeof d === "string" && /^\/Date\(\d+\)\/$/.test(d)) {
        d = new Function("return new " + d.replace(/\//g, ''))();
    } else if (typeof d === 'string' && !f) {
        f = d;
        d = new Date();
    } else if (typeof d === 'number') {
        d = new Date(d);
    } else if (!(d instanceof Date)) {
        return '';
    }

    var now;
    var today;
    var date;
    var initDate = function () {
        now = new Date();
        today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    if (f === 'minutes') {
        initDate();

        var res = '';
        if (today - date == 86400000) {
            res += '昨天 ';
        } else if (today - date == 0) {
            // res += '今天';
        } else {
            res += pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + " ";
        }
        res += pad(d.getHours()) + ':' + pad(d.getMinutes());
        return res;
    } else if (f === 'short') {
        initDate();

        if (today - date == 86400000) {
            return '昨天' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        } else if (today - date == 0) {
            var minutes = Math.round((now - d) / 60000);

            if (minutes <= 2) {
                return '刚刚';
            } else if (minutes < 60) {
                return minutes + '分钟前';
            } else {
                var hours = Math.round(minutes / 60);
                if (hours < 12) {
                    return hours + '小时前';
                } else {
                    return pad(d.getHours()) + ':' + pad(d.getMinutes());
                }
            }
        } else {
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        }
    }

    var week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

    var y = d.getFullYear() + "",
        M = d.getMonth() + 1,
        D = d.getDate(),
        H = d.getHours(),
        m = d.getMinutes(),
        s = d.getSeconds(),
        mill = d.getMilliseconds() + "0000";
    return (f || 'yyyy-MM-dd HH:mm:ss').replace(/y{4}/, y)
        .replace(/y{2}/, y.substr(2, 2))
        .replace(/M{2}/, pad(M))
        .replace(/M/, M)
        .replace(/W/, week[d.getDay()])
        .replace(/d{2,}/, pad(D))
        .replace(/d/, D)
        .replace(/H{2,}/i, pad(H))
        .replace(/H/i, H)
        .replace(/m{2,}/, pad(m))
        .replace(/m/, m)
        .replace(/s{2,}/, pad(s))
        .replace(/s/, s)
        .replace(/f+/, function (w) {
            return mill.substr(0, w.length);
        });
}
