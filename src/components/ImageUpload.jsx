import React, { Component } from 'react';

export class ImageUpload extends Component {
    onFileInputClick = e => {
        const {
            onClick,
            nativeUpload
        } = this.props;

        if (onClick && typeof onClick === 'function') {
            onClick();
        }

        if (nativeUpload) {
            nativeUpload(this.uploadCallback);
            e.preventDefault();
            e.stopPropagation();
        }
        // 连续上传同一文件不触发onChange事件
        // onChange事件触发的条件为其value发生变化
        e.target.value = null;
    }

    uploadCallback = async ({ success, src }) => {
        const { onChange } = this.props;
        onChange({
            success,
            src
        });
    }

    onFileChange = e => {
        const file = e.target.files[0];
        const {
            doUpload,
            quality = 70
        } = this.props;

        if (!file) return;

        compressImage(file, quality, async blob => {
            var res = await doUpload(blob);
            this.uploadCallback(res);
        });
    }

    render() {
        return (
            <div class={'ps_r ' + (this.props.className || '')}>
                <input
                    type="file"
                    accept="image/*"
                    className="dock op_0 zi_3 w_full h_full"
                    onClick={this.onFileInputClick}
                    onChange={this.onFileChange}
                />
                {this.props.children}
            </div>
        );
    }
}

function compressImage(imageFile, quality, cb) {
    var reader = new FileReader();
    reader.onload = async e => {
        var image = new Image();
        image.src = e.target.result;

        if (!image.complete) {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });
        }

        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, image.width, image.height);
        canvas.toBlob(cb, 'image/jpeg', quality);
    };
    reader.readAsDataURL(imageFile);
}
