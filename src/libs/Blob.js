var hasBlobConstructor =
    window.Blob &&
    (function () {
        try {
            return Boolean(new Blob());
        } catch (e) {
            return false;
        }
    })();
var hasArrayBufferViewSupport =
    hasBlobConstructor &&
    window.Uint8Array &&
    (function () {
        try {
            return new Blob([new Uint8Array(100)]).size === 100;
        } catch (e) {
            return false;
        }
    })();
var BlobBuilder =
    window.BlobBuilder ||
    window.WebKitBlobBuilder ||
    window.MozBlobBuilder ||
    window.MSBlobBuilder;


export function getBlob(byteString, mediaType) {
    var arrayBuffer = new ArrayBuffer(byteString.length);
    var intArray = new Uint8Array(arrayBuffer);
    for (var i = 0; i < byteString.length; i += 1) {
        intArray[i] = byteString.charCodeAt(i);
    }

    if (hasBlobConstructor) {
        return new Blob([hasArrayBufferViewSupport ? intArray : arrayBuffer], {
            type: mediaType
        });
    }
    var bb = new BlobBuilder();
    bb.append(arrayBuffer);
    return bb.getBlob(mediaType);
}