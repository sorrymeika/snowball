import { isString, joinPath } from '../../utils';

function resolveUrl(mainUrl, path) {
    if (/^(https?:)?\/\//.test(path)) {
        return path;
    }
    return joinPath(mainUrl, path);
}

export function loadProject(projectUrl) {
    return httpGet(projectUrl, {
        headers: {
            'Cache-Control': 'no-cache'
        }
    })
        .then((html) => {
            html.replace(/<link\s+href="(.+?)"\s+/g, (match, url) => {
                loadCss(resolveUrl(projectUrl, url));
                return match;
            });

            const scripts = [];
            html.replace(/<script.*?(?:\s+src="(.+?)")?.*?>([\S\s]*?)<\/script>/g, (match, url, text) => {
                const scriptPromise = new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    if (url) {
                        httpGet(resolveUrl(projectUrl, url))
                            .then((text) => {
                                script.text = text;
                                resolve(script);
                            });
                    } else if (text) {
                        script.text = text;
                        resolve(script);
                    } else {
                        resolve();
                    }
                });
                scripts.push(scriptPromise);
            });

            return Promise.all(scripts)
                .then(scripts => {
                    scripts.forEach((script) => {
                        if (script) {
                            document.body.appendChild(script);
                        }
                    });
                });
        });
}


function ajax(params) {
    var url = params.url,
        method = params.method || 'GET',
        headers = params.headers,
        data = params.data || null,
        beforeSend = params.beforeSend,
        success = params.success,
        error = params.error;

    if (!url) return;
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function () {
        success(xhr.responseText, xhr);
    });
    error && xhr.addEventListener('error', error);

    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");

    if (headers) {
        Object.keys(headers).forEach((key) => {
            xhr.setRequestHeader(key, headers[key]);
        });
    }

    beforeSend && beforeSend(xhr);

    xhr.send(data);
}

function httpGet(url, options) {
    return new Promise((resolve, reject) => {
        ajax({
            url,
            ...options,
            success: resolve,
            error: reject
        });
    });
}

export async function loadJSON(src: string) {
    try {
        if (!src) throw new Error('src is required');
        const res = await fetch(src, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json; charset=UTF-8',
                'Cache-Control': 'no-cache'
            }
        });
        return res.json();
    } catch (err) {
        return {};
    }
}

export function loadImg(src: string | HTMLImageElement): Promise<HTMLImageElement> {
    if (process.env.NODE_ENV === 'test') return Promise.resolve();

    if (!src) throw new Error('src can not be null!');

    return new Promise((resolve, reject) => {
        let node;
        if (isString(src)) {
            node = document.createElement('img');
            node.src = src;
        } else {
            node = src;
        }

        function gc() {
            node.onload = node.onerror = null;
        }
        if (node.complete) {
            resolve(node);
        } else {
            node.onload = () => {
                gc();
                resolve(node);
            };
            node.onerror = () => {
                gc();
                reject();
            };
        }
    });
}

/**
 * 预加载 图片数组
 * @param {图片地址列表} srcList
 */
export function loadImgs(srcList: string[] | HTMLImageElement[]): Promise<HTMLImageElement[]> {
    if (!Array.isArray(srcList)) {
        throw new Error('loadImgs 入参为数组');
    }
    const loadList = srcList.map(src => loadImg(src));
    return Promise.all(loadList);
}

export function loadCss(src: string) {
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = src;
    document.getElementsByTagName('head')[0].appendChild(styleSheet);
}
