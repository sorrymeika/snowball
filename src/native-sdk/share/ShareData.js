import { sdk } from '../sdk';

type ShareListItem = {
    title: string,
    content: string,
    imageUrl: string,
    pageUrl: string,
    shareType: ShareTypes,
    contentType: number,
    iconUrl?: string
}

export type ShareDataProps = {
    // 是否分享
    isShare?: boolean,
    // 主标题
    shareTitle: string,
    // 副标题
    shareContent: string,
    // 分享地址
    shareUrl: string,
    // 缩略图片,
    shareImg: string,
    shareTypes?: ShareTypes[],
    // 不同分享类型列表，传入此参数后不用传入shareTypes
    shareList?: ShareListItem[],
    // 来源打点参数
    source?: string;
    // 打点参数
    eventParams?: object;
}

/**
 * 提前准备分享数据，在页面加载的时刻调用
 * @export
 */
async function prepareShareData(shareData: ShareDataProps) {
    if (!shareData || !Object.keys(shareData).length) return;
    var shareImg = shareData.shareImg;

    shareData = {
        ...shareData,
        shareImg: shareImg && ((shareImg.startsWith('//') ? location.protocol : '') + shareImg),
        shareUrl: shareData.shareUrl,
    };

    sdk.execute('prepareShareData', {
        ...shareData,
        shareList: shareData.shareList
            ? shareData.shareList.map((item) => ({
                ...{
                    title: shareData.shareTitle,
                    content: shareData.shareContent,
                    pageUrl: shareData.shareUrl,
                },
                ...item,
                imageUrl: item.imageUrl || shareData.shareImg,
            }))
            : null
    });
}

export class Sharer {
    data = [];

    set(shareInfo: ShareDataProps, autoSync = true) {
        let { length } = this.data;
        this.data[length ? length - 1 : 0] = shareInfo;
        autoSync && this.sync();
        return this;
    }

    get() {
        let { length } = this.data;
        return length ? this.data[length - 1] : null;
    }

    push(shareInfo: ShareDataProps, autoSync = true) {
        this.data.push(shareInfo);
        autoSync && this.sync();
        return this.data.length;
    }

    pop(autoSync = true) {
        let popData = this.data.pop();
        autoSync && this.sync();
        return popData;
    }

    clear(autoSync = true) {
        this.data = [];
        autoSync && this.sync();
        return this;
    }

    sync() {
        prepareShareData(this.get() || {
            isShare: false,
            shareTitle: '',
            shareContent: '',
            shareUrl: '',
            shareImg: ''
        });
    }
}

// 分享操作封装
export const ShareData = new Sharer();

export default ShareData;
