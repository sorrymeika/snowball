import React, { Component } from 'react';
import { uploadImgV2, fetchPrivateFileGWKey } from '../core/filegw';
import { openCameraOrGallery } from '../core/appsdk/photo';
import { FILEGW } from '../core/env';
import { transformTFSImageUrl } from '../utils/tfs';

export class ImageUploader extends Component {
    onFileInputClick = e => {
        const { isPublic = true, onCameraClick } = this.props;
        if (onCameraClick && typeof onCameraClick === 'function') {
            onCameraClick();
        }
        var supportNative = openCameraOrGallery(
            { isPublic: isPublic.toString() },
            res => {
                if (res.img) {
                    this.uploadCallback(res.img);
                }
            }
        );
        if (supportNative) {
            e.preventDefault();
            e.stopPropagation();
        }
        // 连续上传同一文件不触发onChange事件
        // onChange事件触发的条件为其value发生变化
        e.target.value = null;
    };

    uploadCallback = async key => {
        const { isPublic = true } = this.props;
        const { onChange } = this.props;
        if (isPublic) {
            onChange({
                key,
                src: transformTFSImageUrl(key)
            });
        } else {
            let res = await fetchPrivateFileGWKey(key);
            if (res.success && res.data.fileToken) {
                const fullUrl =
                    FILEGW +
                    `file?token=${encodeURIComponent(res.data.fileToken)}`;
                onChange({
                    key,
                    src: fullUrl
                });
            }
        }
    };

    onFileChange = e => {
        var file = e.target.files[0];
        if (!file) return;
        const { isPublic = true } = this.props;
        updloadImage(
            file,
            key => {
                this.uploadCallback(key);
            },
            isPublic
        );
    };

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

function updloadImage(imageFile, cb, isPublic) {
    compressImage(imageFile, 70, async blob => {
        var res = await uploadImgV2(blob, 'CC_CMS', isPublic);
        var values = Object.values(res);
        cb(values ? values[0] : null);
    });
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
