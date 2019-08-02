import React, { Component } from "react";
import ReactDOM from 'react-dom';
import { $, debounce, throttle } from "../utils";
import { computeFrame, animate } from "../graphics/animation";
import { android, IS_SNOWBALL_WEBVIEW } from "../env";

const getCurrentTime = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

let lastTime = 0;
const [rAF, cAF] = false
    ? [function (callback) {
        var now = Date.now();
        var time = Math.max(0, 16.7 - (now - lastTime));
        var id = setTimeout(function () {
            callback(now + time);
        }, time);

        lastTime = now + time;
        return id;
    }, function (id) {
        clearTimeout(id);
    }]
    : [requestAnimationFrame, cancelAnimationFrame];

const SHOULD_ADJUST_SCROLLTOP_FOR_INPUTS = android && IS_SNOWBALL_WEBVIEW;
const touchMoveEventStore = new WeakSet();

if ('ontouchmove' in document.body) {
    (document.getElementById('root') || document.body).addEventListener('touchmove', (e) => {
        if (touchMoveEventStore.has(e) && !e.isFromScrollMove) {
            e.preventDefault();
        }
    });
}

export default class VScrollView extends Component {

    constructor(props) {
        super(props);

        const _self = this;

        this._rect = Object.defineProperties({}, {
            type: {
                value: 'scroll'
            },
            target: {
                get() {
                    return _self.container;
                }
            },
            x: {
                get() {
                    return _self.scrollLeft();
                }
            },
            y: {
                get() {
                    return _self.scrollTop();
                }
            },
            width: {
                get() {
                    return _self.container.clientWidth;
                }
            },
            height: {
                get() {
                    return _self.container.clientHeight;
                }
            },
            scrollHeight: {
                get() {
                    return _self.scrollHeight();
                }
            },
            scrollWidth: {
                get() {
                    return _self.scrollWidth();
                }
            }
        });
    }

    componentDidMount() {
        const el = ReactDOM.findDOMNode(this);
        if (SHOULD_ADJUST_SCROLLTOP_FOR_INPUTS) {
            $(el).on("focus touchend", "input:not(readonly),textarea:not(readonly)", (e) => {
                setTimeout(() => {
                    let node = e.currentTarget;
                    if (document.activeElement === node) {
                        let offsetTop = 0;
                        do {
                            offsetTop += node.offsetTop;
                            node = node.offsetParent;
                        } while (node && el !== node && !$.contains(node, el));

                        const bottomHeight = 90;

                        if (this.scrollTop() + el.clientHeight - bottomHeight < offsetTop) {
                            var y = offsetTop - el.clientHeight + bottomHeight;
                            this.scrollTop(y);
                        }
                    }
                }, 300);
            });
            this.despose = () => $(el).off("focus touchend");
        }

        el.__widget_scroll__ = this;
    }

    componentWillUnmount() {
        this.container.__widget_scroll__ = null;
        this.despose && this.despose();
    }

    _setWrapperRef = (ref) => {
        this.container = ref;
    }

    _setContentRef = (ref) => {
        this.content = ref;
    }

    stopMomentum() {
        if (this.momentumId) {
            cAF(this.momentumId);
            this.momentumId = null;
        }
    }

    onTouchStart = (e) => {
        this.stoppedMomentum = this.momentumId;
        this.stopMomentum();

        const clientHeight = this.container.clientHeight;
        this.minY = 0;
        this.maxY = this.scrollHeight() - clientHeight;

        const point = e.touches[0];

        this.startScrollTop = this.scrollTop();
        this.startY = point.pageY;
        this.startX = point.pageX;
        this.history = [{
            time: getCurrentTime(),
            x: this.startX,
            y: this.startY
        }];
    }

    onTouchMove = (e) => {
        if (!this.history) return;

        const point = e.touches[0],
            pointX = point.pageX,
            pointY = point.pageY;

        // 初始是x轴移动大于y轴移动时，则终止scroll
        if (this.history.length == 1 && Math.abs(pointX - this.startX) > Math.abs(pointY - this.startY)) {
            this.history = null;
            return;
        }

        this.history.push({
            time: getCurrentTime(),
            x: pointX,
            y: pointY
        });

        if (this.history.length > 30) {
            this.history = this.history.slice(-10);
        }

        this.scrollTop(this.startScrollTop + (pointY - this.startY) * -1);

        touchMoveEventStore.add(e.nativeEvent);
    }

    onTouchEnd = (e) => {
        // touchstart未触发的情况直接return
        if (!this.history) return;

        const touches = e.changedTouches,
            point = touches[0];

        let length = this.history.length;

        if (length > 1) {
            this.history.push({
                x: point.pageX,
                y: point.pageY,
                time: getCurrentTime()
            });
            length++;

            let i = length,
                pointer,
                lastPointer = this.history[length - 1],
                startPointer = this.history[length - 2];

            while (--i >= 0) {
                pointer = this.history[i];
                if (lastPointer.time - pointer.time < 200) {
                    startPointer = pointer;
                } else {
                    break;
                }
            }

            const offsetY = lastPointer.y - startPointer.y;
            if (Math.abs(offsetY) > 10) {
                const ms = lastPointer.time - startPointer.time;
                let velocity = offsetY * -1 / ms;
                let prevTime = getCurrentTime();
                let prevScrollTop = this.scrollTop();

                velocity *= Math.max(1.5, Math.abs(velocity));

                // window.log(ms + ',' + offsetY + ',' + velocity);

                const momentum = () => {
                    const offsetTime = getCurrentTime() - prevTime;
                    velocity *= 1 - (.03 * offsetTime / 16);

                    if (Math.abs(velocity) > .06) {
                        const movingY = Math.round(velocity * offsetTime);
                        const scrollTop = prevScrollTop + movingY;
                        if (scrollTop <= this.maxY && scrollTop >= this.minY) {
                            prevScrollTop = scrollTop;
                            if (movingY != 0) this.scrollTop(scrollTop);
                            this.momentumId = rAF(momentum);
                        } else {
                            if (scrollTop > this.maxY) {
                                this.scrollTop(this.maxY);
                            } else if (scrollTop < this.minY) {
                                this.scrollTop(this.minY);
                            }
                            this.stoppedMomentum = this.momentumId = null;
                        }
                    } else {
                        this.stoppedMomentum = this.momentumId = null;
                    }

                    prevTime = getCurrentTime();
                };
                this.momentumId = rAF(momentum);
            }
        }

        if (this.momentumId || this.stoppedMomentum) {
            e.preventDefault();
            e.stopPropagation();
        }

        this.history = null;
    }

    onTouchCancel = () => {
        this.history = null;
    }

    isScrollToBottom() {
        const el = this.container;
        return !el ? false : (this.scrollTop() + el.clientHeight >= this.scrollHeight() - 50);
    }

    scrollLeft(x) {
        if (x === undefined) {
            return this.container.scrollLeft;
        }
        this.container.scrollLeft = x;
    }

    scrollTop(y) {
        if (y === undefined) {
            return this.container.scrollTop;
        }
        this.container.scrollTop = y;
    }

    scrollWidth() {
        return this.container.scrollWidth;
    }

    scrollHeight() {
        return this.container.scrollHeight;
    }

    scrollToTop(duration) {
        this.scrollTo(this.scrollLeft(), 0, duration);
    }

    scrollTo(x, y, duration, callback) {
        this.stopMomentum();

        if (duration) {
            const startX = this.scrollLeft();
            const startY = this.scrollTop();
            const distX = x - startX;
            const distY = y - startY;

            animate(
                (progress) => {
                    this.scrollLeft(startX + computeFrame(0, distX, progress));
                    this.scrollTop(startY + computeFrame(0, distY, progress));
                },
                duration,
                "ease",
                () => {
                    requestAnimationFrame(() => {
                        this._scrollStop();
                        callback && callback();
                    });
                }
            );
        } else {
            this.scrollLeft(x);
            this.scrollLeft(y);
        }
    }

    scrollListeners = [];

    addOnScrollListener = (fn) => {
        this.scrollListeners.push(fn);
    }

    removeOnScrollListener = (fn) => {
        const index = this.scrollListeners.findIndex(fn);
        if (index != -1) {
            this.scrollListeners.splice(index, 1);
        }
    }

    scrollStopListeners = [];

    addOnScrollStopListener(fn) {
        this.scrollStopListeners.push(fn);
    }

    removeOnScrollStopListener(fn) {
        var index = this.scrollStopListeners.findIndex(fn);
        if (index != -1) {
            this.scrollStopListeners.splice(index, 1);
        }
    }

    onScroll = (e) => {
        this._scrollStop();
        this.props.onScroll && this.props.onScroll(this._rect);
        this.scrollListeners.forEach(fn => fn(this._rect));
        this.detectImageLazyLoad();
    }

    imageLazyLoad() {
        const container = this.container;
        const images = $(container).find("img[data-src]");

        if (!images.length) return;

        const viewHeight = window.innerHeight * 1.2;
        const isScrollToBottom = this.isScrollToBottom();

        images.each((i, img) => {
            if (img.src) {
                img.classList.remove('img-lazyloading');
            }
            const src = img.getAttribute("data-src");
            if (!src || src == img.src) {
                img.removeAttribute("data-src");
                return;
            }

            if (isScrollToBottom || img.getBoundingClientRect().top < viewHeight) {
                img.src = src;
                img.removeAttribute("data-src");

                if (!img.complete) {
                    const $img = $(img);
                    function onload() {
                        setTimeout(() => {
                            $img.animate({
                                opacity: 1
                            }, 300, () => {
                                $img.removeClass('app-img-lazyloading');
                            });
                        }, 0);
                        complete();
                    }

                    function onerror() {
                        complete();
                    }

                    function complete() {
                        $img.off('load', onload)
                            .off('error', onerror);
                    }

                    $img
                        .addClass('app-img-lazyloading')
                        .on('load', onload)
                        .on('error', onerror);
                }
            }
        });
    }

    render() {
        const {
            className,
            containerStyle,
            children
        } = this.props;

        return (
            <div
                ref={this._setWrapperRef}
                onScroll={this.onScroll}
                onTouchStart={this.onTouchStart}
                onTouchMove={this.onTouchMove}
                onTouchEnd={this.onTouchEnd}
                onTouchCancel={this.onTouchCancel}
                className={className}
                style={{
                    overflow: 'hidden'
                }}
            >
                <div
                    style={containerStyle}
                    ref={this._setContentRef}
                >
                    {children}
                </div>
            </div>
        );
    }
}

VScrollView.prototype.detectImageLazyLoad = throttle(function () {
    this.imageLazyLoad();
}, 80);

VScrollView.prototype._scrollStop = debounce(function () {
    const e = {
        ...this._rect,
        type: 'scrollstop'
    };
    this.scrollStopListeners.forEach(fn => fn(e, e));
    if (this.isScrollToBottom()) {
        this.props.onReachBottom && this.props.onReachBottom(e);
    }
}, 80);

