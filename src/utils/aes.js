require('../cryptojs/aes');
require('../cryptojs/mode-ecb');

var util = require('util');

module.exports = {
    encrypt: function (secretKey, word) {

        secretKey = CryptoJS.enc.Utf8.parse(secretKey);
        word = CryptoJS.enc.Utf8.parse(word);

        var encrypted = CryptoJS.AES.encrypt(word, secretKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });

        return encrypted.toString();
    },

    decrypt: function (secretKey, word) {
        secretKey = CryptoJS.enc.Utf8.parse(secretKey);

        var decrypt = CryptoJS.AES.decrypt(word, secretKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });

        return CryptoJS.enc.Utf8.stringify(decrypt).toString();
    },

    genKey: function () {
        return util.randomString(16)
    }
}