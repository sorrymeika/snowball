var $ = require('$'),
    util = require('util'),
    ua = navigator.userAgent,
    ios = util.ios,
    isAndroid = util.android,
    slice = Array.prototype.slice,
    blankFn = function () { },
    baseUrl = $('meta[name="api-base-url"]').attr('content'),
    hybridFunctions = {};

window.hybridFunctions = hybridFunctions;

window.dispatchEventForNative = function (type, data) {
    $(window).trigger(type, data);
};

var guid = 0;

var bridge = {
    isInApp: /SLApp/.test(ua),
    isAndroid: isAndroid,
    android: isAndroid,
    ios: ios,
    versionName: isAndroid ? '1.0' : "1.0",
    exec: hybrid,
    tip: function (msg) {
        hybrid('tip', msg + "");
    },
    openInApp: function (title, url) {

        hybrid('openInApp', url == undefined ? {
            url: title
        } : {
                title: title,
                url: url
            });
    },
    open: function (url) {
        hybrid('open', url + '');
    },

    //@url = "http://xx.xxx.com/cmbpay/{orderid}#跳转招行支付的地址"
    cmbpay: function (url) {
        hybrid('cmbpay', url + '');
    },

    image: {

        //@callback=function(res={id:2,src:"base64OriginImg",thumbnail:'base64Thumbnail'})
        photo: function (allowsEditing, callback) {
            if (typeof allowsEditing == 'function') callback = allowsEditing, allowsEditing = true;

            hybrid('image', {
                type: 'photo',
                allowsEditing: allowsEditing

            }, callback);
        },

        //@callback=function(res={id:2,src:"base64OriginImg",thumbnail:'base64Thumbnail'})
        camera: function (allowsEditing, callback) {
            if (typeof allowsEditing == 'function') callback = allowsEditing, allowsEditing = true;

            hybrid('image', {
                type: 'camera',
                allowsEditing: allowsEditing
            }, callback);
        },

        /**
         * @param {Array} images [{name:"file",value:imageid},{name:'file2',value:1}]
         */
        upload: function (url, data, images, crop, callback) {

            if (typeof crop === 'function') callback = crop, crop = false;

            if (typeof images == 'object' && !Array.isArray(images)) {
                images = Object.keys(images).map(function (key) {
                    return {
                        name: key,
                        value: images[key]
                    }
                });
            }

            hybrid('image', {
                type: 'upload',
                url: url,
                data: data,
                images: images,
                crop: crop

            }, callback);

        },

        /**
         * 保存链接到相册
         * 
         * @param {String} url 图片链接
         */
        save: function (url, callback) {

            hybrid('image', {
                type: 'save',
                url: url

            }, callback);
        }
    },

    motion: {
        start: function () {
            hybrid('motion', {
                type: 'start'
            });
        },

        stop: function () {
            hybrid('motion', {
                type: 'stop'
            });
        }
    },

    contact: {
        //@options={ position: 0, size: 50, filter="phoneNumber='13323433332'" }
        getContacts: function (options, process, success) {
            if (arguments.length == 1) {
                fn = options, options = {};
            } else if (!options) {
                options = {};
            }
            options.type = "getContacts";

            hybrid('contact', options, process, success);
        },

        setContacts: function (data, success) {
            hybrid('contact', {
                type: 'setContacts',
                data: data

            }, success || util.noop);
        }
    },

    pickColor: function (f) {
        hybrid('pickColor', f);
    },

    rn: function (params, cb) {
        hybrid('rn', Object.assign({
            url: '',
            token: '',
            sign: ''

        }, params), cb || util.noop);
    },

    system: {
        info: function (callback) {
            hybrid('system', {
                type: 'info'

            }, callback);
        },

        copyToClipboard: function (text, callback) {
            hybrid('system', {
                type: 'copyToClipboard',
                text: text

            }, callback);
        },

        phoneCall: function (phoneNumber, callback) {
            hybrid('system', {
                type: 'phoneCall',
                phoneNumber: phoneNumber

            }, callback);
        },

        openPhoneCall: function (phoneNumber) {
            hybrid('system', {
                type: 'openPhoneCall',
                phoneNumber: phoneNumber
            });
        },

        sendSMS: function (phoneNumber, msg) {
            hybrid('system', {
                type: 'sendSMS',
                msg: msg,
                phoneNumber: phoneNumber
            });
        },

        /**
         * 设置屏幕亮度
         * 
         * @param {number} brightness 0~255
         */
        setBrightness: function (brightness, callback) {
            hybrid('system', {
                type: 'setBrightness',
                brightness: brightness
            }, callback || util.noop);
        },

        /**
         * 获取屏幕亮度回调
         * 
         * @callback brightnessCallback
         * @param {number} brightness
         * 
         * 获取屏幕亮度
         * 
         * @param {brightnessCallback} cb 回调函数
         */
        getBrightness: function (cb) {
            hybrid('system', {
                type: 'getBrightness'
            }, cb);
        }
    },

    getDeviceToken: function (callback) {
        hybrid('getDeviceToken', callback);
    },

    statusBar: function (type) {
        hybrid('statusBar', type);
    },

    qrcode: {

        //@callback=function({code:xxxx}){}
        scan: function (callback) {
            hybrid('qrcode', {
                type: 'scan'

            }, callback);
        }
    },

    assets: {

        //@return={data:[{albumId:"xx-xx",albumName:"相册"}]}
        albums: function (callback) {
            hybrid('assets', {
                type: 'album'

            }, callback);
        },

        //@params = { albumId:"xx-xx-xx", page:1, pageSize:20, size:120 }
        //@return={ albumId:'xx-xx-xx',data:[{id:'xx-xx-xx',src:'base64ImgString'}]}
        thumbnails: function (params, callback) {

            hybrid('assets', {
                type: 'thumbnails',
                albumId: params.albumId,
                width: params.size || 120,
                height: params.size || 120,
                page: params.page || 1,
                pageSize: params.pageSize || 50

            }, callback);

        },

        image: function (albumId, assetId, callback) {

            hybrid('assets', {
                type: 'image',
                albumId: albumId,
                assetId: assetId

            }, callback);
        }
    },

    //@callback = function({longitude,latitude})
    getLocation: function (callback) {
        hybrid('getLocation', callback);
    },
    alipay: function (data, f) {
        hybrid('pay', data, f);
    },
    wx: function (data, f) {
        hybrid('wx', data, f);
    },
    ali: function (data, f) {
        hybrid('ali', data, f);
    },
    qq: function (data, f) {
        hybrid('qq', data, f);
    },
    share: function () {
        hybrid('share');
    },
    isDevelopment: navigator.platform == "Win32" || navigator.platform == "Win64",
    url: function (url) {
        return /^http\:\/\//.test(url) ? url : (baseUrl + url);
    },
    post: function (url, data, files, callback) {
        callback = typeof files === 'function' ? files : callback;
        files = typeof files === 'function' ? null : files;

        hybrid('post', {
            url: this.url(url),
            files: files,
            data: data
        }, callback);
    },
    exit: function () {
        hybrid('exit');
    },
    update: function (updateUrl, versionName, f) {

        if (!updateUrl) {
            return;
        }

        if (isAndroid) {
            hybrid('updateApp', {
                downloadUrl: updateUrl,
                versionName: versionName
            }, f);
        } else {
            this.open(updateUrl);
        }
    }
};


function nativeCallback(callback, processCallback) {

    if (typeof callback == "function") {
        if (!processCallback) {
            var callbackKey = "nativeCallback" + (++guid);

            hybridFunctions[callbackKey] = function () {
                callback.apply(null, arguments);
                delete hybridFunctions[callbackKey];
            };

            return {
                callback: callbackKey
            }

        } else {
            var callbackKey = "nativeCallback" + (++guid);
            var processKey = "nativeCallback" + (++guid);

            hybridFunctions[callbackKey] = function () {
                callback.apply(null, arguments);
                delete hybridFunctions[callbackKey];
                delete hybridFunctions[processKey];
            };

            hybridFunctions[processKey] = function () {
                processCallback.apply(null, arguments);
            };

            return {
                callback: callbackKey,
                process: processKey
            }
        }

    }
}

/*
method:string, params:object, process:function, hybridCallback:function
    | method:string, process, hybridCallback
    | method:object={ method:string, params:object,process:function(res){},callback:function(res){} }
*/
function hybrid(method, params, process, callback) {
    var data;

    if (typeof method == 'object') {
        callback = data.callback;
        process = data.process;

    } else {
        if (typeof params === "function")
            callback = process, process = params, params = null;

        if (!callback) {
            callback = process;
            process = undefined;
        }

        data = {
            method: method,
            params: params
        }
    }

    Object.assign(data, nativeCallback(callback, process))

    if (bridge.isInApp)
        alert('slapp://' + JSON.stringify(data));

    else {

        console.log("bridge:", data);

        var cb = hybridFunctions[data.callback];

        switch (data.method) {
            case 'system':
                switch (data.params.type) {
                    case "info":
                        cb({});
                        break;
                }
                break;

            case 'image':
                switch (data.params.type) {
                    case "camera":
                    case "photo":
                        cb({
                            id: 0
                        });
                        break;
                    case "upload":
                        cb({
                            success: true,
                            data: {
                                msg_id: 1,
                                content: '2016/11/08/204e3e8de3af42049b4f5308b4a3aa29.png'
                            }
                        });
                        break;
                }
                break;

            case 'getDeviceToken':
                cb('46e68c4b71854f9943edaac95a9d1552a3352c91');
                break;

            case "contact":
                var proc = hybridFunctions[data.process];

                switch (data.params.type) {
                    case "getContacts":
                        var contactsResult = {
                            success: true,
                            data: [{
                                phoneNumber: '18721979478',
                                contactName: 'asdf'
                            }, {
                                phoneNumber: '15900914293',
                                contactName: 'asdf1'
                            }, {
                                phoneNumber: '13900914293',
                                contactName: 'asdf2'
                            }, {
                                phoneNumber: '18755334433',
                                contactName: 'asdf哈'
                            }, {
                                phoneNumber: '112-13900914293',
                                contactName: 'asdaaf2'
                            }]
                        }

                        if (proc) {
                            proc(contactsResult);
                            cb({ success: true });

                        } else
                            cb(contactsResult)
                        break;
                }
                break;
        }
    }
}

bridge.hasStatusBar = bridge.isInApp && util.ios && util.osVersion >= 7;

module.exports = bridge;