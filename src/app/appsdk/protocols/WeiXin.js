import { WX_JS_URL, IS_WX, WX_APP_ID } from "../../../env";
import { loadJs } from "../../../utils";
import { popup } from "../../../widget/popup";
import toast from "../../../widget/toast";

type WXConfig = {
    // 必填，生成签名的时间戳
    timestamp: number,
    // 必填，生成签名的随机串
    noncestr: string,
    // 必填，签名，见附录1
    signature: string
}


/**
 * 设置微信分享信息
 * config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，
 * config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。
 * 对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
 * @param {any} [shareInfo={}]
 */
async function prepareShareData(shareData = {}, wechatConfig) {
    if (window.wx) {
        window.wx.config({
            // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
            debug: false,
            // 必填，公众号的唯一标识
            appId: WX_APP_ID,
            // 必填，生成签名的时间戳
            timestamp: wechatConfig.timestamp,
            // 必填，生成签名的随机串
            nonceStr: wechatConfig.noncestr,
            // 必填，签名，见附录1
            signature: wechatConfig.signature,
            // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
            jsApiList: ['onMenuShareAppMessage', 'onMenuShareTimeline']
        });
        window.wx.ready(() => {
            window.wx.onMenuShareAppMessage({
                title: shareData.title,
                desc: shareData.desc,
                link: shareData.link,
                imgUrl: shareData.img,
                trigger: function () { },
                success: function () { },
                cancel: function () { },
                fail: function () { }
            });
            window.wx.onMenuShareTimeline({
                // 分享标题
                title: shareData.title,
                // 分享链接
                link: shareData.link,
                // 分享图标
                imgUrl: shareData.img,
                trigger: function () { },
                success: function () { },
                cancel: function () { },
                fail: function () { }
            });
        });
    }
};

function verifyWX(cb) {
    if (IS_WX) {
        loadJs(WX_JS_URL).then(cb);
        return true;
    }
    return false;
}

export class WeiXin {
    constructor(requester) {
        this.requester = requester;
    }

    prepareShareData(data) {
        return verifyWX(() => {
            // 调用微信js接口，设置分享信息
            this.requester.requestConfig(location.href)
                .then(([wechatConfig]) => {
                    wechatConfig && prepareShareData({
                        title: data.shareTitle,
                        desc: data.shareContent,
                        link: data.shareUrl,
                        img: data.shareImg
                    }, wechatConfig);
                });
        });
    }

    showShareView(cb, text?) {
        return verifyWX(() => {
            !text
                ? toast.showToast('通过点击右上角在微信中分享')
                : popup.popup({
                    animate: 'fade',
                    className: 'app-wx-share-mask',
                    clickMaskToHide: true,
                    content: `<div class="word invite_friends">
                    <p>请点击右上角<span class="iconfont icon-more"></span></p>
                    <p>${text}</p>
                </div>
                <div class="share-arr-rem"></div>`
                });
        });
    }

    openInBrowser() {
        return verifyWX(() => {
            popup.popup({
                animate: 'fade',
                className: 'app-wx-share-mask',
                clickMaskToHide: true,
                content: `<div class="word download">
            <p>请点击右上角<span class="iconfont icon-more"></span></p>
            <p>选择在浏览器中打开，如</p>
            <div class="icons flex">
                <div class="share-safari-rem"></div>
                <div class="share-chrome-rem"></div>
                <div class="share-uc-rem"></div>
            </div>
        </div>
        <div class="share-arr-rem"></div>`
            });
        });
    }

    pay(paycode) {
    }
}

export interface IWeiXinRequester {
    requestConfig(): WXConfig
}

export default WeiXin;