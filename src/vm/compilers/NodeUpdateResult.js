
export default function NodeUpdateResult(result) {
    result && Object.assign(this, result);
}

NodeUpdateResult.prototype = {
    canUpdateAttributes: true,
    isBreak: false,
    ignoreChildNodes: false,
    nextSibling: undefined
};