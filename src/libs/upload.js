function sendAsBinary(xhr, text) {
    var data = new ArrayBuffer(text.length);
    var uia = new Uint8Array(data);
    for (var i = 0; i < text.length; i++) {
        uia[i] = (text.charCodeAt(i) & 0xff);
    }
    xhr.send(uia.buffer);
}

/**
 * 文件上传
 */
export function uploadBlob(url, blob, options = { contentType: 'image/png', fileName: 'a.png' }) {
    const boundary = "WebKitFormBoundaryoJ0uuJghwGS3ADUL";

    return new Promise((resolve, reject) => {
        var fr = new FileReader();
        fr.onload = function (e) {
            var data = e.target.result;

            var xhr = new XMLHttpRequest();
            xhr.addEventListener('load', function () {
                resolve(JSON.parse(xhr.responseText));
            });
            xhr.addEventListener('error', (e) => {
                reject(e);
            });

            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", 'multipart/form-data; boundary=' + boundary);

            xhr.withCredentials = true;

            sendAsBinary(xhr, '--' + boundary + '\r\n' +
                'Content-Disposition: form-data; name="file"; filename="' + options.fileName + '"\r\nContent-Type: ' + options.contentType + '\r\n\r\n' +
                data + '\r\n' +
                '--' + boundary + '--\r\n');
        };
        fr.readAsBinaryString(blob);
    });
}
