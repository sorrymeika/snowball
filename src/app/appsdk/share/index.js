/*
 * 分享相关
 */
import { sdk } from '../sdk';
import ShareData from './ShareData';

export { ShareData };

/**
 * 调用分享 显示native弹窗
 * 执行之前必须调用 prepareShareData
 * 微信中是否显示蒙层
 */
export function showShareView(wxMaskText?) {
    sdk.execute('showShareView', wxMaskText);
}

export function openInBrowser() {
    sdk.execute('openInBrowser');
}

/**
 * 直接分享不弹分享框
 * @param {object} shareData 分享参数
 * @param {string} shareData.title 分享标题
 * @param {string} shareData.content 内容
 * @param {number} shareData.contentType 内容类型，默认4
 * 1-文本分享，2-图片分享，3-二维码图片分享，4-超链接分享，5-视频分享
 * contentType 不同场景的必选字段:
 * 1-文本分享： content
 * 2-图片分享
 * 3-二维码图片分享：
 *     微信/朋友圈 --– imageUrl
 *     微博----- imageUrl + content
 * 4-超链接分享：title + content + imageUrl + pageUrl
 * 5-视频分享: title + content + imageUrl + pageUrl
 * @param {number} shareData.shareType 分享类型：1-微信好友，2-微信朋友圈 ，3-微博，4-短信
 * @param {string} shareData.source 内容
 * @param {string} shareData.eventParams 内容
 * @param {function} [cb] 回调函数
 */
export function shareDirectly(shareData: {
    title: string,
    content: string,
    pageUrl: string,
    imageUrl: string,
    shareType: number,
    contentType: number,
    source?: string,
    eventParams?: string,
}, cb?) {
    if (process.env.NODE_ENV === 'development') {
        console.log("%cShareData:", 'background:#c00;color:#fff;', shareData);
    }
    sdk.execute('shareDirectly', shareData, cb);
}

