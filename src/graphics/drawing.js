import { osVersion, android } from '../env';
import '../libs/canvas-to-blob';
import { base64 } from '../utils';

class Drawing {
    constructor(options) {
        const { width, height } = options;
        const cvs = document.createElement('canvas');
        cvs.width = width;
        cvs.height = height;
        this.cvs = cvs;
        this.ctx = cvs.getContext('2d');
    }

    draw = async commands => {
        for (let cmd of commands) {
            try {
                switch (cmd.shift()) {
                    case 'IMG':
                        await this.drawImage.apply(this, cmd);
                        break;
                    case 'RECT_FILL':
                        this.fillRect.apply(this, cmd);
                        break;
                    case 'TXT':
                        this.drawText.apply(this, cmd);
                        break;
                    case 'QR':
                        await this.drawQRCode.apply(this, cmd);
                        break;
                    case 'RECT':
                        this.drawRect.apply(this, cmd);
                        break;
                    case 'LINE':
                        this.drawLine.apply(this, cmd);
                        break;
                    case 'ROUND_RECT':
                        this.drawRoundedRect.apply(this, cmd);
                        break;
                    default:
                        break;
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    getCanvas() {
        return this.cvs;
    }

    getContext() {
        return this.ctx;
    }

    toBase64() {
        return this.cvs.toDataURL();
    }

    toBlob(callback, type, encoderOptions) {
        return this.cvs.toBlob(callback, type, encoderOptions);
    }

    fillRect(color, options) {
        const { posX, posY, width, height } = options;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(posX, posY, width, height);
    }

    drawImage(src, options) {
        const { posX, posY, width, height, isCircle = false } = options;
        return new Promise(async (resolve, reject) => {
            if (!src) return reject();

            const img = new Image();
            if (!src.startsWith('data')) {
                if (android && osVersion <= 4.3 && !src.startsWith(location.origin)) {
                    src = await new Promise((success, fail) => {
                        var xhr = new XMLHttpRequest();
                        xhr.addEventListener('load', function () {
                            var uInt8Array = new Uint8Array(this.response);
                            var i = uInt8Array.length;
                            var binaryString = new Array(i);
                            while (i--) {
                                binaryString[i] = String.fromCharCode(uInt8Array[i]);
                            }
                            var data = binaryString.join('');
                            success("data:image/png;base64," + base64(data));
                        });
                        xhr.addEventListener('error', fail);
                        xhr.open("GET", src, true);
                        xhr.responseType = "arraybuffer";
                        xhr.send(null);
                    })
                        .catch((e) => {
                            return src;
                        });
                } else {
                    img.crossOrigin = 'Anonymous';
                }
            }
            img.src = src;
            const onImageLoad = () => {
                if (isCircle) {
                    this.ctx.save();
                    this.ctx.arc(posX + width / 2, posY + height / 2, width / 2, 0, 2 * Math.PI);
                    this.ctx.clip();
                }
                this.ctx.drawImage(img, posX, posY, width, height);
                if (isCircle) {
                    this.ctx.restore();
                }
                resolve();
            };
            if (img.complete) {
                onImageLoad();
            } else {
                img.onload = onImageLoad;
            }
            img.onerror = () => reject();
        });
    }

    drawText(text, options) {
        const { posX, posY, color, fontSize, rows = 1, rowWidth = 0, indent = 0, lineHeight = 0, isCenter = false } = options;
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px Arial`;
        if (isCenter) {
            this.ctx.textAlign = "center";
        } else {
            this.ctx.textAlign = "left";
        }
        if (rows > 1 && rowWidth !== 0) {
            const textLength = text.length;
            for (let index = 1, textStart = 0, row = 0; index <= textLength && row < rows; index++) {
                let rowText = text.substring(textStart, index);
                if (this.ctx.measureText(rowText).width >= rowWidth - (row == 0 ? indent : 0) || index == textLength) {
                    if (row + 1 === rows && index < textLength) {
                        rowText = rowText.substr(0, rowText.length - 1) + '...';
                    }
                    this.ctx.fillText(rowText, posX + (row == 0 ? indent : 0), posY + row * lineHeight);
                    textStart = index;
                    row++;
                }
            }
        } else {
            this.ctx.fillText(text, posX + indent, posY);
            return this.ctx.measureText(text);
        }
    }

    drawQRCode(text, options) {
        return new Promise(async (resolve, reject) => {
            const drawQR = () => {
                this.qrcode.toDataURL(
                    text,
                    { errorCorrectionLevel: 'H', width: options.width, margin: 0 },
                    (err, data) => {
                        if (err) {
                            reject(err);
                        }
                        this.drawImage(data, options)
                            .then(() => {
                                resolve();
                            })
                            .catch(err => {
                                reject(err);
                            });
                    }
                );
            };
            if (this.qrcode) {
                drawQR();
            } else {
                this.qrcode = await import('qrcode');
            }
        });
    }

    drawRect(color, lineWidth, options) {
        const { posX, posY, width, height } = options;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(posX, posY, width, height);
    }

    drawLine(color, lineWidth, options) {
        const { startX, startY, endX, endY } = options;
        const { ctx } = this;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.closePath();
    }

    drawRoundedRect(color, options) {
        const { ctx } = this;
        const { posX, posY, width, height, radius = 0, shadowColor = '#fff', shadowBlur = 0 } = options;
        ctx.strokeStyle = this.formatColor(color, options);
        ctx.fillStyle = this.formatColor(color, options);
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.beginPath();
        ctx.moveTo(posX, posY + radius);
        ctx.lineTo(posX, posY + height - radius);
        ctx.quadraticCurveTo(posX, posY + height, posX + radius, posY + height);
        ctx.lineTo(posX + width - radius, posY + height);
        ctx.quadraticCurveTo(posX + width, posY + height, posX + width, posY + height - radius);
        ctx.lineTo(posX + width, posY + radius);
        ctx.quadraticCurveTo(posX + width, posY, posX + width - radius, posY);
        ctx.lineTo(posX + radius, posY);
        ctx.quadraticCurveTo(posX, posY, posX, posY + radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    formatColor(color, options = {}) {
        if (typeof color === 'string') {
            return color;
        }
        if (Array.isArray(color)) {
            const { ctx } = this;
            const [startColor, endColor] = color;
            const { posX = 0, posY = 0, width = 1 } = options;
            let linear = ctx.createLinearGradient(posX, posY, posX + width, posY);
            linear.addColorStop(0, startColor);
            linear.addColorStop(1, endColor);
            return linear;
        }
    }
}

export default Drawing;
