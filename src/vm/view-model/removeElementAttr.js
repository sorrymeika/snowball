export function removeElementAttr(el, attributeName) {
    var snAttributes = el.snAttributes;
    if (snAttributes) {
        for (var i = 0, n = snAttributes.length; i < n; i += 2) {
            if (snAttributes[i] == attributeName) {
                el.snValues[i / 2] = undefined;
                break;
            }
        }
    }
    el.removeAttribute(attributeName);
}