import ShareTypes from "./ShareTypes";
import { ShareDataProps } from "./ShareData";
import { ShareContentTypes } from "..";


export default function parseShareData(data: ShareDataProps) {
    let {
        shareUrl,
        shareTitle,
        shareContent,
        shareContentMap,
        shareImg,
        shareTypes,
        shareList
    } = data;

    const shareData = {
        appTit: shareTitle,
        appContent: shareContent,
        appPage: shareUrl,
        appUrl: shareImg,
        appImgURL: shareImg,
        shareList: shareList
            ? shareList.map((shareItem) => {
                return shareItem.contentType == ShareContentTypes.Image
                    ? {
                        appUrl: shareItem.imageUrl,
                        shareType: '' + shareItem.shareType
                    }
                    : {
                        appTit: shareItem.title,
                        appContent: shareItem.content,
                        appPage: shareItem.pageUrl,
                        appUrl: shareItem.imageUrl,
                        shareType: '' + shareItem.shareType
                    };
            })
            : (shareTypes || [ShareTypes.WXConversation, ShareTypes.WXTimeLine, ShareTypes.Weibo]).map(type => ({
                appTit: shareTitle,
                appContent: shareContentMap
                    ? shareContentMap[type] || shareContentMap[`type${type}`]
                    : shareContent,
                appPage: shareUrl,
                appUrl: shareImg,
                shareType: '' + type
            }))
    };
    return shareData;
}