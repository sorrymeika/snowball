export function cookie(a, b, c, p) {
    if (b === undefined) {
        var res = document.cookie.match(new RegExp("(^| )" + a + "=([^;]*)(;|$)"));
        if (res != null)
            return unescape(res[2]);
        return null;
    } else {
        if (b === null) {
            b = cookie(name);
            if (b != null) c = -1;
            else return;
        }
        if (c) {
            var d = new Date();
            d.setTime(d.getTime() + c * 24 * 60 * 60 * 1000);
            c = ";expires=" + d.toGMTString();
        }
        document.cookie = a + "=" + escape(b) + (c || "") + ";path=" + (p || '/');
    }
}

export function store(key, value) {
    if (typeof value === 'undefined')
        return JSON.parse(localStorage.getItem(key));
    if (value === null)
        localStorage.removeItem(key);
    else
        localStorage.setItem(key, JSON.stringify(value));
}

export const session = typeof sessionStorage === 'undefined' ? store : function session(key, value) {
    if (typeof value === 'undefined')
        return JSON.parse(sessionStorage.getItem(key));
    if (value === null)
        sessionStorage.removeItem(key);
    else
        sessionStorage.setItem(key, JSON.stringify(value));
};

if (typeof localStorage === 'undefined') {
    window.localStorage = {
        setItem(key, value) {
            localStorage[key] = value + '';
        },
        getItem(key) {
            return localStorage[key] || null;
        },
        removeItem(key) {
            return delete localStorage[key];
        }
    };
}
