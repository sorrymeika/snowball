import preloader from '../../preloader';
import { isString, loadJs, joinPath } from '../../utils';

export async function loadProject(projectUrl) {
    let mainUrl;
    let mainJS;
    let vendorsJS;
    let bundleJS;
    let mainCSS;

    if (/asset-manifest\.json$/.test(projectUrl)) {
        let manifest = preloader.getManifest(projectUrl);
        if (!manifest) {
            manifest = await loadJSON(projectUrl);
        }
        mainUrl = projectUrl.slice(0, projectUrl.lastIndexOf('/') + 1);

        Object.keys(manifest.files)
            .forEach((key) => {
                if (/^main[\w.]*\.js$/.test(key)) {
                    mainJS = manifest.files[key];
                } else if (/^main[\w./]*\.css$/.test(key)) {
                    mainCSS = manifest.files[key];
                } else if (/^vendors[~\w.]*\.js$/.test(key)) {
                    vendorsJS = manifest.files[key];
                }
            });
    } else {
        const result = await fetch(
            projectUrl,
            projectUrl.startsWith('http://localhost')
                ? undefined
                : {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                }
        ).then(response => response.text());

        mainUrl = projectUrl;
        mainCSS = (result.match(/<link\s+href="(?:\.\/)?([\w./]+\.css)"/) || [])[1];

        bundleJS = result.match(/<script[^>]+?src="[^"]*(static\/js\/bundle[\w.]*\.js)"/)[1];
        vendorsJS = result.match(/<script[^>]+?src="[^"]*(?:\/)?(static\/js\/(vendors)[~\w.]*\.js)"/)[1];
        mainJS = result.match(/<script[^>]+?src="[^"]*(static\/js\/main[\w.]*\.js)"/)[1];
    }

    mainCSS && loadCss(joinPath(mainUrl, mainCSS));
    bundleJS && await loadJs(joinPath(mainUrl, bundleJS));
    vendorsJS && await loadJs(joinPath(mainUrl, vendorsJS));
    await loadJs(joinPath(mainUrl, mainJS));
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
