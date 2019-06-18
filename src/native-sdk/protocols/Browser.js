export class Browser {
    prepareShareData(data) {
        this.shareData = data;
    }

    showShareView() {
        if (process.env.NODE_ENV === 'development') {
            console.log("%cShareData:", 'background:#c00;color:#fff;', this.shareData);
        }
    }

    openInBrowser() {
    }
}

export default Browser;