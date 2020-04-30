import { Page } from "../app/core/Page";
import { Sharer } from "./webview-sdk/share/ShareData";

Page.extentions.lifecycle({
    initialize() {
        const sharer = new Sharer();
        const sharerWrapper = {
            push: (shareData) => {
                sharer.push(shareData, this.isActive());
                return sharerWrapper;
            },
            get: () => {
                return sharer.get();
            },
            set: (shareData) => {
                sharer.set(shareData, this.isActive());
                return sharerWrapper;
            },
            pop: () => {
                sharer.pop(this.isActive());
                return sharerWrapper;
            },
            clear: () => {
                sharer.clear(this.isActive());
                return sharerWrapper;
            },
            sync() {
                sharer.sync();
            }
        };
        this._sharer = sharerWrapper;
    },
    onShow() {
        this._sharer.sync();
    }
});

Page.extentions.mixin({
    getSharer() {
        return this._sharer;
    },

    setShareData(shareData) {
        this._sharer.set(shareData);
        return this;
    },

    getShareData() {
        return this._sharer.get();
    }
});