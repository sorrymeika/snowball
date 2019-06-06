import { getBlob } from "./Blob";

/*
 * JavaScript Canvas to Blob
 * https://github.com/blueimp/JavaScript-Canvas-to-Blob
 *
 * Copyright 2012, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on stackoverflow user Stoive's code snippet:
 * http://stackoverflow.com/q/4998908
 */

/* global atob, Blob, define */


var CanvasPrototype = window.HTMLCanvasElement && window.HTMLCanvasElement.prototype;
var dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/;
var dataURLtoBlob = function (dataURI) {
    var matches,
        mediaType,
        isBase64,
        dataString,
        byteString;
    // Parse the dataURI components as per RFC 2397
    matches = dataURI.match(dataURIPattern);
    if (!matches) {
        throw new Error('invalid data URI');
    }
    // Default to text/plain;charset=US-ASCII
    mediaType = matches[2]
        ? matches[1]
        : 'text/plain' + (matches[3] || ';charset=US-ASCII');
    isBase64 = !!matches[4];
    dataString = dataURI.slice(matches[0].length);
    if (isBase64) {
        // Convert base64 to raw binary data held in a string:
        byteString = atob(dataString);
    } else {
        // Convert base64/URLEncoded data component to raw binary:
        byteString = decodeURIComponent(dataString);
    }

    return getBlob(byteString, mediaType);
};

if (window.HTMLCanvasElement && !CanvasPrototype.toBlob) {
    if (CanvasPrototype.mozGetAsFile) {
        CanvasPrototype.toBlob = function (callback, type, quality) {
            var self = this;
            setTimeout(function () {
                if (quality && CanvasPrototype.toDataURL && dataURLtoBlob) {
                    callback(dataURLtoBlob(self.toDataURL(type, quality)));
                } else {
                    callback(self.mozGetAsFile('blob', type));
                }
            });
        };
    } else if (CanvasPrototype.toDataURL && dataURLtoBlob) {
        CanvasPrototype.toBlob = function (callback, type, quality) {
            var self = this;
            setTimeout(function () {
                callback(dataURLtoBlob(self.toDataURL(type, quality)));
            });
        };
    }
}

export { dataURLtoBlob };