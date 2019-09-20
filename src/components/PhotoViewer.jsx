import React from 'react';
import ReactDOM from 'react-dom';
import { $ } from '../utils';
import { ViewModel } from '../vm';
import { addOnBeforeBackListener, removeOnBeforeBackListener } from '../app';
import { animate, computeFrame } from '../graphics/animation';

export class PhotoViewer extends ViewModel {
    static defaultAttributes = {
        card: 0,
        x: 0,
        y: 0,
        s: 1,
        index: 0,
        images: [],
        minScale: 1,
        after: null,
        slots: [],
    }

    get el() {
        return `<div class= "app-photoviewer t_3" sn-transitionend="this.transitionEnd()" sn-click="this.resetSize()" sn-touchstart="this.touchStart()" sn-touchmove="this.touchMove()" sn-touchend="this.touchEnd()">
        <div class="app-photoviewer-before" sn-if="{slots.length}" ref="before"></div>
        <ul class="app-photoviewer-con" ref="content" style="-webkit-transform:translate({x}px,0px) translateZ(0);width:{(images.length + slots.length)*100}%">
            <li class="app-photoviewer-item" sn-repeat="slot in slots"><div class="app-photoviewer-item-con" ref="slots"></div></li>        
            <li class="app-photoviewer-item" sn-repeat="item in images"><div class="app-photoviewer-item-con" ref="items"><p ref="bds" style="-webkit-transform:translate({item.x}px,{item.y}px) translateZ(0);-webkit-transform-origin: 0% 0%;"><img style="-webkit-transform:translate(-50%,-50%) scale({item.s});-webkit-transform-origin: 50% 50%;" sn-image="{item.src}" ref="images" /></p></li>
            <li class="app-photoviewer-after" sn-if="{images.length}" sn-html="{after}"></li>
        </ul>
        <div class="app-photoviewer-indicator flex jc_c cl_fff" sn-if="{!(slots.length > 0 && index < slots.length)}">{index+1-slots.length}/{images.length}</div>
    </div>`;
    }

    constructor(attributes) {
        super({ attributes });

        this._('images').each(function (model) {
            model.set({
                x: 0,
                y: 0,
                s: 1
            });
        });

        this.set({
            x: -1 * this.attributes.index * (this.el.offsetWidth || window.innerWidth)
        });
    }

    index(index) {
        if (index === undefined) return this.attributes.index;

        this.set({
            x: -1 * index * (this.el.offsetWidth || window.innerWidth),
            index: index
        });
    }

    transitionEnd() {
        if (!this.$el.hasClass('show')) {
            this.attributes.onHide && this.attributes.onHide();
            this.$el.remove();
        }
    }

    hide() {
        this.$el.removeClass('show');
        this.attributes.onPhotoViewHide && this.attributes.onPhotoViewHide(this.attributes.index);
        removeOnBeforeBackListener(onBack);
    }

    show() {
        /* eslint no-unused-expressions: "off" */
        this.$el.appendTo(document.body)[0].offsetHeight;
        this.$el.addClass('show');
        addOnBeforeBackListener(onBack);
    }

    resetSize(e) {
        setTimeout(() => {
            if (!e.isPropagationStopped()) {
                if (!this.currentItem || this.currentItem.attributes.s === 1) {
                    this.hide();
                } else {
                    this.currentItem.set({
                        s: 1,
                        x: 0,
                        y: 0
                    });
                }
            }
        });
    }

    setImages(images) {
        images.forEach(function (img) {
            img.s = 1;
            img.x = 0;
            img.y = 0;
        });

        this.set({
            images: images
        });
        return this;
    }

    setSlots(slots) {
        this.set({
            slots
        });
        return this;
    }

    onPhotoChange(index) {
        this.attributes.onPhotoChange && this.attributes.onPhotoChange(index);
    }

    touchStart(e) {
        if (this.bounceBack) return;
        if (this.momentum) {
            this.momentum.stop();
            this.momentum = null;
        }
        const touches = e.touches;

        this.startTouches = [].map.call(touches, function (item) {
            return {
                x: item.pageX,
                y: item.pageY
            };
        });
        const index = this.attributes.index;
        const slots = this.attributes.slots;
        const imageIndex = this.attributes.index - slots.length;
        const isSlot = slots.length > 0 && index < slots.length;

        if (isSlot) {
            this.currentItem = this.collection('slots')[index];
            this.currentEl = this.refs.slots[index];
        } else {
            this.currentItem = this.collection('images')[imageIndex];
            this.currentEl = this.refs.items[imageIndex];
        }

        if (this.currentItem) {
            this.isStart = true;
            this.touchLen = -1;
            this.bounce = 0;

            this.originX = this.attributes.x;
            this.originY = this.attributes.y;
            this.originW = this.currentEl.clientWidth;
            this.originH = this.currentEl.clientHeight;
            this.originS = this.currentItem.attributes.s;
            this.itemStartX = this.currentItem.attributes.x;
            this.itemStartY = this.currentItem.attributes.y;
            this.isMoveItem = false;
            this.isMoveLeft = false;

            if (!isSlot) {
                this.currentImage = this.refs.images[imageIndex];
                this.currentBd = this.refs.bds[imageIndex];

                if (this.currentImage.complete) {
                    this.imageW = Math.round(this.currentImage.offsetWidth * this.originS);
                    this.imageH = Math.round(this.currentImage.offsetHeight * this.originS);

                    this.maxX = Math.max(0, (this.originW - this.imageW) / 2 * -1);
                    this.maxY = Math.max(0, (this.originH - this.imageH) / 2 * -1);
                    this.minX = Math.min(0, (this.originW - this.imageW) / 2);
                    this.minY = Math.min(0, (this.originH - this.imageH) / 2);

                    if (touches.length == 2) {
                        var w = touches[0].pageX - touches[1].pageX;
                        var h = touches[0].pageY - touches[1].pageY;
                        this.startL = Math.sqrt(w * w + h * h);
                        this.startPointX = (touches[0].pageX + touches[1].pageX) / 2;
                        this.startPointY = (touches[0].pageY + touches[1].pageY) / 2;

                        this.pointerLeft = this.startPointX - this.itemStartX - ((this.originW - this.imageW) / 2);
                        this.pointerTop = this.startPointY - this.itemStartY - ((this.originH - this.imageH) / 2);
                    } else if (this.imageW > this.originW || this.imageH > this.originH) {
                        this.isMoveItem = true;
                        this.touchesCaches = [{ x: touches[0].pageX, y: touches[0].pageY, timerstamp: Date.now() }];
                    }
                }
            }
        }

        this.longTapTimeout = setTimeout(() => {
            this.attributes.onLongTap && this.attributes.onLongTap(this.currentItem.attributes, index);
        }, 750);
    }

    clearLongTabTimeout() {
        if (this.longTapTimeout) {
            clearTimeout(this.longTapTimeout);
            this.longTapTimeout = null;
        }
    }

    touchMove(e) {
        const self = this;

        this.clearLongTabTimeout();

        if (!this.isStart) return;

        const touches = e.touches;

        if (this.touchLen != -1) {
            if (this.touchLen != touches.length) {
                this.isStart = false;
                return;
            }
        } else
            this.touchLen = touches.length;

        $(e.target).trigger('touchcancel');

        if (this.touchLen == 1) {
            var dx0 = touches[0].pageX - this.startTouches[0].x;
            var dy0 = touches[0].pageY - this.startTouches[0].y;
            var x;
            var y;
            var bounce;

            if (this.isMoveItem) {
                x = self.itemStartX + dx0;
                y = self.itemStartY + dy0;

                bounce = x > this.maxX ? this.maxX - x : x < this.minX ? this.minX - x : 0;

                this.currentItem.set({
                    x: (x > this.maxX ? this.maxX : x < this.minX ? this.minX : x),
                    y: (y > this.maxY ? this.maxY : y < this.minY ? this.minY : y)
                });

                if (this.touchesCaches.length >= 4) this.touchesCaches.shift();
                this.touchesCaches.push({ x: touches[0].pageX, y: touches[0].pageY, timerstamp: Date.now() });
            }

            if (!this.isMoveItem || bounce) {
                x = self.originX + dx0;
                let minX = this.$el[0].offsetWidth - this.refs.content.offsetWidth;
                bounce = x > 0 ? -x : x < minX ? minX - x : 0;
                bounce && this.attributes.onBounceMove && this.attributes.onBounceMove(bounce);
                this.bounce = bounce;
                this.isMoveLeft = e.touches[0].pageX < this.__lastX;

                self.set({
                    x: x > 0 ? x / 2 : x < minX ? minX + (x - minX) / 2 : x,
                    y: self.originY + dy0
                });
            }
            this.__lastX = e.touches[0].pageX;

        } else {
            var w = touches[0].pageX - touches[1].pageX;
            var h = touches[0].pageY - touches[1].pageY;
            var l = Math.sqrt(w * w + h * h);

            var pointX = (touches[0].pageX + touches[1].pageX) / 2;
            var pointY = (touches[0].pageY + touches[1].pageY) / 2;

            var s = Math.max(self.attributes.minScale, self.originS * (l / this.startL));
            var changedRatio = (s - self.originS) / self.originS;
            var offsetX = this.pointerLeft * changedRatio;
            var offsetY = this.pointerTop * changedRatio;

            self.currentItem.set({
                s,
                x: this.itemStartX + pointX - this.startPointX - offsetX + (this.imageW / 2) * changedRatio,
                y: this.itemStartY + pointY - this.startPointY - offsetY + (this.imageH / 2) * changedRatio
            });
        }

        return false;
    }

    touchEnd(e) {
        this.clearLongTabTimeout();

        var touches = e.changedTouches;
        this.isStart = false;
        var self = this;
        var width;
        var elWidth = this.$el[0].offsetWidth;
        var minX;
        var minY;

        if (this.touchLen == 1) {
            width = elWidth - this.refs.content.offsetWidth;
            var x = this.attributes.x;
            var cX = this.attributes.index * elWidth * -1;
            var bounceBack = x > 0 ? -x : x < width ? width - x : 0;

            x = x > 0 ? 0 : x < width ? width : x < cX && this.isMoveLeft ? cX - elWidth : x > cX && !this.isMoveLeft ? cX + elWidth : cX;

            var index = x * -1 / elWidth;
            var indexChanged = index !== this.attributes.index;

            if (!indexChanged && !this.bounce && this.isMoveItem) {
                this.touchesCaches.push({ x: touches[0].pageX, y: touches[0].pageY, timerstamp: Date.now() });

                var length = this.touchesCaches.length;
                if (length > 1) {
                    var i = length;
                    var pointer;
                    var lastPointer = this.touchesCaches[length - 1];
                    var startPointer = this.touchesCaches[length - 2];
                    while (--i >= 0) {
                        pointer = this.touchesCaches[i];
                        if (lastPointer.timerstamp - pointer.timerstamp < 50) {
                            startPointer = pointer;
                        } else {
                            break;
                        }
                    }
                    var duration = Math.max(Math.abs(lastPointer.x - startPointer.x), Math.abs(lastPointer.y - startPointer.y)) * 6;
                    if (duration != 0) {
                        if (duration < 400) duration = 400;
                        minX = this.minX;
                        minY = this.minY;

                        var fromX = this.currentItem.attributes.x;
                        var fromY = this.currentItem.attributes.y;
                        var offsetX = lastPointer.x - startPointer.x;
                        var offsetY = lastPointer.y - startPointer.y;
                        offsetX = Math.abs(offsetX) < 10 ? (offsetX * offsetX * (offsetX < 0 ? -1 : 1)) : offsetX * 10;
                        offsetY = Math.abs(offsetY) < 10 ? (offsetY * offsetY * (offsetY < 0 ? -1 : 1)) : offsetY * 10;
                        var toX = Math.max(minX - 20, Math.min(this.maxX + 20, fromX + offsetX));
                        var toY = Math.max(minY - 20, Math.min(this.maxY + 20, fromY + offsetY));
                        var endX = Math.max(minX, Math.min(this.maxX, toX));
                        var endY = Math.max(minY, Math.min(this.maxY, toY));

                        this.momentum = animate((d) => {
                            this.currentItem.set({
                                x: computeFrame(fromX, toX, d),
                                y: computeFrame(fromY, toY, d)
                            });
                        }, duration, 'easeOutCubic', () => {
                            this.momentum = null;
                            if (toX != endX || toY != endY) {
                                this.bounceBack = animate((d) => {
                                    this.currentItem.set({
                                        x: computeFrame(toX, endX, d),
                                        y: computeFrame(toY, endY, d)
                                    });
                                }, 200, 'easeOutCubic', () => {
                                    this.bounceBack = null;
                                });
                            }
                        });
                    }
                }
            }
            var currentItem = this.currentItem;
            $(this.refs.content).addClass('t_3')[0].clientHeight;

            this.set({
                x: x,
                index: index
            }).nextTick(() => {
                setTimeout(() => {
                    $(self.refs.content).removeClass('t_3')[0].clientHeight;

                    bounceBack && this.attributes.onBounceBack && this.attributes.onBounceBack(bounceBack);

                    if (indexChanged) {
                        this.onPhotoChange(index);
                        currentItem.set({
                            s: 1,
                            x: 0,
                            y: 0
                        });
                    }
                }, 300);
            });
        } else if (this.touchLen == 2) {
            let { s, x, y } = this.currentItem.attributes;

            this.imageW = Math.round(this.currentImage.offsetWidth * s);
            this.imageH = Math.round(this.currentImage.offsetHeight * s);

            this.maxX = Math.max(0, (this.originW - this.imageW) / 2 * -1);
            this.maxY = Math.max(0, (this.originH - this.imageH) / 2 * -1);
            this.minX = Math.min(0, (this.originW - this.imageW) / 2);
            this.minY = Math.min(0, (this.originH - this.imageH) / 2);

            var tX = Math.max(this.minX, Math.min(this.maxX, x));
            var tY = Math.max(this.minY, Math.min(this.maxY, y));

            if (x != tX || y != tY) {
                this.bounceBack = animate((d) => {
                    this.currentItem.set({
                        x: computeFrame(x, tX, d),
                        y: computeFrame(y, tY, d)
                    });
                }, 200, 'easeOutCubic', () => {
                    this.bounceBack = null;
                });
            }
        }
        this.touchLen = -1;
    }
}

interface IPhotoViewerComponentProps {
    images: Array<{ src: string }>
}

export default class PhotoViewerComponent extends React.Component<IPhotoViewerComponentProps, never> {

    static show(images, {
        index: defaultIndex = 0,
        after,
        slots = [],
        onPhotoChange,
        onPhotoViewHide,
        onBounceMove,
        onBounceBack,
        onLongTap,
        ...options
    } = {}) {
        if (!this.photoViewer) {
            this.photoViewer = new PhotoViewer({
                images,
                index: defaultIndex,
                slots,
                onHide: () => {
                    this.photoViewer.setImages([]);
                }
            });
        } else {
            this.photoViewer.setImages(images)
                .index(defaultIndex);
            this.photoViewer.setSlots(slots);
        }
        this.photoViewer.set({
            after,
            onPhotoChange,
            onPhotoViewHide,
            onBounceMove,
            onBounceBack,
            onLongTap
        });
        this.photoViewer.show();
        return this.photoViewer;
    }

    static hide() {
        if (this.photoViewer) {
            this.photoViewer.hide();
        }
    }

    shouldComponentUpdate(nextProps) {
        if (this.props.images !== nextProps.images) {
            this.photoViewer.set({
                images: nextProps.images
            });
        }
        return false;
    }

    componentDidMount() {
        this.photoViewer = new PhotoViewer({
            images: this.props.images
        });
        this.photoViewer.$el.appendTo(ReactDOM.findDOMNode(this));
    }

    render() {
        return <div className="dock z_1000"></div>;
    }
}

function onBack(event) {
    event.preventDefault();
    PhotoViewerComponent.hide();
}