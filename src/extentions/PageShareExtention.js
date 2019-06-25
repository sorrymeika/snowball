import { Page } from "../app/core/Page";
import { Sharer } from "../native-sdk/share/ShareData";

Page.extentions.lifecycle({
    initialize() {
        this._sharer = new Sharer();
    },
    onShow() {
        this._sharer.sync();
    }
});

Page.extentions.mixin({
    getSharer() {
        return {
            push: (shareData) => {
                this._sharer.push(shareData, this.isActive());
                return this;
            },
            get: () => {
                return this._sharer.get();
            },
            set: (shareData) => {
                this.setShareData(shareData);
            },
            pop: () => {
                this._sharer.pop(this.isActive());
                return this;
            },
            clear: () => {
                this._sharer.clear(this.isActive());
                return this;
            }
        };
    },

    setShareData(shareData) {
        this._sharer.set(shareData, this.isActive());
        return this;
    },

    getShareData() {
        return this._sharer.get();
    }
});