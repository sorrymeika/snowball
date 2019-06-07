import { animate } from '../graphics/animation';
import Event, { EventEmitter } from '../core/event';
import { $, isFunction } from '../utils';

const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

export default class Toucher extends EventEmitter {

    constructor(el, options) {
        super();

        var $el = $(el);

        this.$el = $el;
        this.el = $el[0];
        this.options = {
            enableVertical: true,
            enableHorizontal: false,
            divisorX: 0,
            divisorY: 0,
            momentum: true,
            debounce: true,
            ...options
        };
        this.minDelta = 0;
        this.minX = 0;
        this.maxX = 0;
        this.minY = 0;
        this.maxY = 0;
        this.x = 0;
        this.y = 0;

        this._scroll = this._scroll.bind(this);
        this._start = this._start.bind(this);
        this._move = this._move.bind(this);
        this._end = this._end.bind(this);

        this.el.addEventListener('scroll', this._scroll, true);

        this.delegate('touchstart', this.options.children, this._start)
            .delegate('touchmove', this.options.children, this._move)
            .delegate('touchend', this.options.children, this._end);
    }

    delegate(event, selector, fn) {
        if (isFunction(selector)) {
            fn = selector;
            selector = null;
        }
        selector
            ? this.$el.on(event, selector, fn)
            : this.$el.on(event, fn);
        return this;
    }

    _scroll = (e) => {
        this.isTriggerScroll = true;
    }

    _start(e) {
        if (e.touches.length > 1 || e.isHoldScroll) return;

        const self = this;
        const beforeStartEvent = new Event('beforestart', {
            currentTarget: e.currentTarget,
            isHoldScroll: e.isHoldScroll,
            touchEvent: e
        });

        self.trigger(beforeStartEvent);

        if (beforeStartEvent.isDefaultPrevented()) {
            return;
        }

        const point = e.touches[0];

        self.pointX = self.startPointX = self.sx = point.pageX;
        self.pointY = self.startPointY = self.sy = point.pageY;

        self.isTouchStop = e.isHoldScroll === true;
        self.isTouchStart = false;
        self.isTouchMoved = false;
        self.possiblyScroll = -1;
        self.isTriggerScroll = false;

        self.startTime = e.timeStamp || Date.now();

        self.startX = self.x;
        self.startY = self.y;

        this.stopMomentum();

        this.history = [{
            time: now(),
            x: point.pageX,
            y: point.pageY
        }];
    }

    _move(e) {
        if (this.isTouchStop || e.isFromScrollMove || (e.isHoldScroll && (this.isTouchStop = true))) return;

        var self = this,
            point = e.touches[0],
            deltaX = self.startPointX - point.pageX,
            deltaY = self.startPointY - point.pageY,
            x,
            y;

        if (!this.history) {
            return;
        }

        this.history.push({
            time: now(),
            x: point.pageX,
            y: point.pageY
        });
        if (this.history.length > 30) {
            this.history = this.history.slice(-10);
        }

        self.deltaX = deltaX;
        self.deltaY = deltaY;

        // touchmove事件触发两次后可能才触发scroll事件
        // 如果触发了scroll事件，就终止当前move事件
        if (self.possiblyScroll <= 0) {
            self.possiblyScroll++;
            return;
        } else if (self.isTriggerScroll) {
            return;
        }

        if (!self.isTouchStart) {
            var isDirectionX = Math.abs(deltaX) >= self.minDelta && Math.abs(deltaX) > Math.abs(deltaY),
                isDirectionY = !isDirectionX;

            if (isDirectionY || isDirectionX) {
                if ((isDirectionY && !self.options.enableVertical) || (isDirectionX && !self.options.enableHorizontal)) {
                    this.stop();
                    return;
                }

                self.isTouchStart = true;
                self.isDirectionY = isDirectionY;
                self.isDirectionX = isDirectionX;
                self.dir = isDirectionX;

                if (!self.hasInit) {
                    self.trigger(new Event('init', {
                        currentTarget: e.currentTarget,
                        sourceEvent: e
                    }));
                    self.hasInit = true;
                }
                const startEvent = new Event('start', {
                    currentTarget: e.currentTarget,
                    sourceEvent: e
                });
                self.trigger(startEvent);

                if (startEvent.isDefaultPrevented()) {
                    self.stop();
                    return;
                }

                if (self.isTouchStop) {
                    return;
                }
            } else {
                return;
            }
        }

        if (self.options.enableHorizontal) {
            x = self.startX + deltaX;
            self.x = x < self.minX ? self.minX + (x - self.minX) / 2 : x > self.maxX ? self.maxX + (x - self.maxX) / 2 : x;
        }

        if (self.options.enableVertical) {
            y = self.startY + deltaY;
            self.y = y < self.minY ? self.minY + (y - self.minY) / 2 : y > self.maxY ? self.maxY + (y - self.maxY) / 2 : y;
        }

        self.isTouchMoved = true;

        self.isMoveToLeft = self.pointX - point.pageX > 0 ? true : self.pointX === point.pageX ? self.isMoveToLeft : false;
        self.isMoveToTop = self.pointY - point.pageY > 0 ? true : self.pointY === point.pageY ? self.isMoveToTop : false;

        self.pointX = point.pageX;
        self.pointY = point.pageY;

        const event = new Event('move', {
            currentTarget: e.currentTarget,
            sourceEvent: e
        });
        self.trigger(event);

        document.cancelLongTap && document.cancelLongTap();

        return !event.isDefaultPrevented();
    }

    _end(e) {
        var self = this;
        var endEvent;

        if ((!this.isTouchMoved || this.isTouchStop) && this.stoppedMomentum) {
            this._naturallyStopped();
            e.cancelTap = true;
            return false;
        }

        if (!this.isTouchStart) return;
        this.isTouchStart = false;

        if (!self.isTouchMoved) return;
        self.isTouchMoved = false;

        if (self.isTouchStop) return;
        self.isTouchStop = true;

        endEvent = new Event('end', {
            currentTarget: e.currentTarget
        });
        self.trigger(endEvent);

        $(e.target).trigger('touchcancel');

        if (endEvent.isDefaultPrevented()) {
            return;
        }

        if (self.shouldBounceBack()) {
            self.bounceBack();
            return;
        }

        if (!this.options.momentum) {
            this._naturallyStopped();
            return;
        }

        var point = e.changedTouches[0],
            length;

        this.history.push({
            x: point.pageX,
            y: point.pageY,
            time: now()
        });
        length = this.history.length;

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
        const offsetX = lastPointer.x - startPointer.x;
        const { enableVertical, enableHorizontal, debounce } = this.options;

        if ((enableVertical && Math.abs(offsetY) > 10) || (enableHorizontal && Math.abs(offsetX) > 10)) {
            const ms = lastPointer.time - startPointer.time;
            let velocityY = offsetY * -1 / ms;
            let velocityX = offsetX * -1 / ms;

            velocityY *= Math.max(1.5, Math.abs(velocityY));
            velocityX *= Math.max(1.5, Math.abs(velocityX));

            let prevTime = now();
            let prevX = this.x;
            let prevY = this.y;

            const momentum = () => {
                const offsetTime = now() - prevTime;
                let { x, y } = this;

                if (enableHorizontal) {
                    velocityX *= 1 - ((this.isOverflowX(prevX) ? .5 : .03) * offsetTime / 16);

                    if (Math.abs(velocityX) > .06) {
                        const movingX = Math.round(velocityX * offsetTime);
                        const left = prevX + movingX;

                        if (debounce || !this.isOverflowX(left)) {
                            prevX = left;
                            if (movingX != 0) {
                                x = left;
                            }
                        } else {
                            if (left > this.maxX) {
                                x = this.maxX;
                            } else if (left < this.minX) {
                                x = this.minX;
                            }
                        }
                    }
                }

                if (enableVertical) {
                    velocityY *= 1 - ((this.isOverflowY(prevY) ? .5 : .03) * offsetTime / 16);

                    if (Math.abs(velocityY) > .06) {
                        const movingY = Math.round(velocityY * offsetTime);
                        const top = prevY + movingY;

                        if (debounce || !this.isOverflowY(top)) {
                            prevY = top;
                            if (movingY != 0) {
                                y = top;
                            }
                        } else {
                            if (top > this.maxY) {
                                y = this.maxY;
                            } else if (top < this.minY) {
                                y = this.minY;
                            }
                        }
                    }
                }

                if (y === this.y && x === this.x) {
                    this._naturallyStopped();
                } else {
                    this._moveTo(x, y);
                    this.momentumId = requestAnimationFrame(momentum);
                }

                prevTime = now();
            };
            this.momentumId = requestAnimationFrame(momentum);
        } else {
            this._naturallyStopped();
        }

        this.history = null;

        return false;
    }

    isOverflowX(x) {
        return x > this.maxX || x < this.minX;
    }

    isOverflowY(y) {
        return y > this.maxY || y < this.minY;
    }

    stopMomentum() {
        this.stoppedMomentum = this.momentumId;
        if (this.momentumId) {
            cancelAnimationFrame(this.momentumId);
            this.momentumId = null;
        }
        return this.stoppedMomentum;
    }

    shouldBounceBack() {
        return (this.options.enableHorizontal && this.isOverflowX(this.x)) || (this.options.enableVertical && this.isOverflowY(this.y));
    }

    bounceBack() {
        var self = this,
            currentX = self.x,
            currentY = self.y,
            distX = 0,
            distY = 0;

        if (self.options.enableHorizontal) {
            if (self.x < self.minX) {
                distX = self.minX - self.x;
            }
            else if (self.x > self.maxX) {
                distX = self.maxX - self.x;
            }
        }
        if (self.options.enableVertical) {
            if (self.y < self.minY) {
                distY = self.minY - self.y;
            }
            else if (self.y > self.maxY) {
                distY = self.maxY - self.y;
            }
        }

        animate(function (d) {
            self.x = currentX + distX * d;
            self.y = currentY + distY * d;

            self.trigger('move');
        }, 300, 'ease', function () {
            self._stop();
            self.trigger('bounceBack');
        });
    }

    _moveTo(x, y) {
        this.x = x;
        this.y = y;
        this.trigger('move');
    }

    scrollTo(x, y, duration, cb) {
        var self = this;
        x = self.options.enableHorizontal ?
            x >= this.maxX ? this.maxX : x <= this.minX ? this.minX : x
            : self.x;

        y = self.options.enableVertical ?
            y >= this.maxY ? this.maxY : y <= this.minY ? this.minY : y
            : self.y;

        var callback = () => {
            cb && cb();
            this.trigger('stop');
        };

        if (!duration) {
            self.x = x;
            self.y = y;

            self.trigger('move');
            callback();
        } else {
            var currentX = self.x;
            var currentY = self.y;
            var distX = x - self.x;
            var distY = y - self.y;
            animate(function (d) {
                self.x = currentX + distX * d;
                self.y = currentY + distY * d;

                self.trigger('move');
            }, duration, 'ease', callback);
        }
    }

    stop() {
        this.isTouchStop = true;
    }

    _naturallyStopped() {
        if (this.shouldBounceBack()) {
            this.bounceBack();
        } else {
            this._stop();
        }
    }

    _stop() {
        this.stoppedMomentum = this.momentumId = null;
        this.history = null;
        this.trigger('stop');
    }

    destroy() {
        this.$el.off('touchstart', this._start)
            .off('touchmove', this._move)
            .off('touchend', this._end);
        this.el.removeEventListener('scroll', this._scroll, true);
    }
}