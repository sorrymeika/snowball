var styleId = 0;

export function style(id, css, isReplace) {
    var doc = document,
        head = doc.getElementsByTagName("head")[0];

    if (css === undefined) {
        css = id;
        id = "style" + (++styleId);
    }
    var style = document.getElementById(id);
    if (style) {
        if (isReplace) {
            style.parentNode.removeChild(style);
        } else {
            return style;
        }
    }

    style = doc.createElement("style");
    style.id = id;
    style.type = "text/css";
    try {
        style.appendChild(doc.createTextNode(css));
    } catch (ex) {
        style.styleSheet.cssText = css;
    }
    head.appendChild(style);

    return style;
}
export default style;