import * as util from '../utils';
import { encodeHTML, $ } from '../utils';
import Toucher from './Toucher';

function Slider(options) {
    options = Object.assign({
        hScroll: true,
        vScroll: false,
        width: '100%',
        index: 0,
        dots: false,
        loop: false,
        // 自动播放间隔时间
        autoLoop: false,
        align: 'center',
        container: null
    }, options);

    Object.assign(this, util.pick(options, ['width', 'loop', 'renderItem', 'template', 'itemTemplate', 'navTemplate']));

    let self = this,
        data = options.data,
        $slider;

    if (typeof self.itemTemplate === 'string') self.itemTemplate = util.template(self.itemTemplate);
    if (typeof self.width === 'string') self.width = parseInt(self.width.replace('%', ''), 10);

    this.options = options;

    self.$el = $(self.template());
    self.el = self.$el[0];

    if (options.container) {
        self.$el.appendTo(options.container);
    }
    if (options.className) {
        self.$el.addClass(options.className);
    }

    self.$slider = $slider = self.$el.find('.js_slider');
    self.slider = $slider[0];
    self.$dots = self.$el.find('.J_SlideNavs').appendTo(self.$el);

    this.touch = new Toucher(self.$el, {
        enableVertical: options.vScroll,
        enableHorizontal: options.hScroll,
        momentum: false
    });

    this.touch
        .on('start', function () {
            if (!self.wrapperW || !self.scrollerW) {
                self.adjustWidth();
            }

            this.maxX = self.scrollerW - self.wrapperW;
            this.minX = 0;

            self.options.autoLoop && self.stopAutoLoop();
        })
        .on('move', function () {
            self.slider.style.transform =
                self.slider.style.webkitTransform = 'translate3d(' + this.x * -1 + 'px,' + this.y * -1 + 'px,0)';

            return false;
        })
        .on('end bounceBack', function (e) {
            if (e.type === 'end' && this.shouldBounceBack()) {
                return;
            }

            var index = e.type === 'bounceBack' ? options.index : this.isMoveToLeft && this.x - this.startX > 0 ? options.index + 1 : !this.isMoveToLeft && this.x - this.startX < 0 ? options.index - 1 : options.index;

            self._toPage(options.loop ? index : index < 0 ? 0 : index >= self.length ? self.length - 1 : index, e.type === 'bounceBack' ? 0 : 250);

            if (self.options.autoLoop) {
                self.startAutoLoop();
            }
        });

    self.set(data);

    $(window).on('ortchange', $.proxy(self.adjustWidth, self));

    if (options.autoLoop) {
        self.startAutoLoop();
    }

    self.$el.css({ overflow: '' });
}

Object.assign(Slider.prototype, {
    loop: false,
    x: 0,
    itemTemplate: '<a href="<%=$data.url%>" <%=$data.attributes%>><img src="<%=$data.src%>" /></a>',
    template: util.template('<div class="app-slider"><ul class="js_slider app-slider-con flex"></ul><ol class="J_SlideNavs app-slider-nav"></ol></div>'),

    _loadImage: function () {
        var self = this;
        var $item = self.$items.eq(self.loop ? self.options.index + 1 : self.options.index);

        if (!$item.prop('_detected')) {
            if (self.loop) {
                if (self.options.index === 0) {
                    $item = $item.add(self.$items.eq(self.$items.length - 1));
                } else if (self.options.index === self.length - 1) {
                    $item = $item.add(self.$items.eq(0));
                }
            }

            $item.find('img[lazyload]').each(function () {
                this.src = this.getAttribute('lazyload');
                this.removeAttribute('lazyload');
            });

            $item.prop('_detected', true);
        }
    },

    _adjustBox: function () {
        var self = this,
            slider = self.$slider,
            children = slider.children(),
            length = children.length;

        self.containerW = self.options.containerWidth || self.el.clientWidth || window.innerWidth;
        self.wrapperW = self.containerW * self.width / 100;
        self.scrollerW = self.wrapperW * length;

        slider.css({ width: length * self.width + '%', marginLeft: '0%' });
        length && children.css({ width: self.wrapperW + 'px' });

        self.touch.maxX = self.scrollerW;
        self.touch.minX = self.wrapperW * -1;
    },

    adjustWidth: function () {
        if (this.containerW !== this.el.clientWidth) {
            this._adjustBox();
            this.index(this.options.index);
        }
    },

    _change: function () {
        var self = this,
            options = self.options;

        if (options.onChange) options.onChange.call(self, options.index);

        self._loadImage();
        self.$dots.children().removeClass('curr')
            .eq(options.index)
            .addClass('curr');
    },

    prepend: function (data) {
        this._data.unshift(data);
        this.$slider.prepend(this.renderItem(data));
        this._adjustBox();
    },

    shift: function () {
        this._data.shift();
        this.$slider.children(":first-child").remove();
        this._adjustBox();
    },

    append: function (data) {
        this._data.push(data);
        this.set(this._data);
    },

    set: function (data) {
        if (!Array.isArray(data)) data = data ? [data] : [];
        this._data = data;

        var lengthChanged = this.length !== data.length;
        if (lengthChanged) this.length = data.length;

        this.render();

        if (lengthChanged) this._adjustBox();

        this.index(this.options.index);

        if (this.options.imagelazyload) {
            this._loadImage();
        }

        return this;
    },

    startAutoLoop: function () {
        var self = this;
        if (self.loopTimer || self.length <= 1) return;

        self.loopTimer = setTimeout(function loopTimeout() {
            var index = self.options.index + 1;
            self._toPage(index, 250);
            self.loopTimer = setTimeout(loopTimeout, self.options.autoLoop);
        }, self.options.autoLoop);
    },

    stopAutoLoop: function () {
        clearTimeout(this.loopTimer);
        this.loopTimer = null;
    },

    _toPage: function (page, duration) {
        var self = this;
        var index = page > this.$items.length ? 0 : page < -1 ? this.$items.length - 1 : page;
        var x = this.wrapperW * (this.loop ? index + 1 : index);

        self.options.index = page >= self.length ? 0 : page < 0 ? self.length - 1 : page;
        self._change();

        self.touch.scrollTo(x, 0, duration, function () {
            if (self.options.index !== index) {
                self.index(index);
            }
        });
    },

    index: function (index, duration) {
        var options = this.options,
            x;

        if (typeof index === 'undefined') return options.index;
        index = index >= this.length ? 0 : index < 0 ? this.length - 1 : index;

        if (this.loop) {
            x = this.wrapperW * (index + 1);
        } else {
            x = this.wrapperW * index;
        }
        if (index !== options.index) {
            options.index = index;
            this._change();
        }

        if (x !== this.x) this.touch.scrollTo(x, 0, duration);
    },

    data: function (index) {
        return this._data[index || this.options.index];
    },

    renderItem: function (dataItem) {
        if (dataItem.attributes) {
            dataItem = {
                ...dataItem,
                attributes: Object.keys(dataItem.attributes)
                    .filter((name) => !!name)
                    .map((name) => name + '="' + encodeHTML(dataItem.attributes[name]) + '"')
                    .join(' ')
            };
        }
        return '<li class="J_SlideItem slider-item flexitem">' + this.itemTemplate(dataItem) + '</li>';
    },

    render: function () {
        var self = this;
        var dotsHtml = '';
        var data = this._data;
        var itemsHtml = '';
        var options = self.options;

        for (var i = 0, n = data.length; i < n; i++) {
            itemsHtml += self.renderItem(Object.assign({ $i: i }, data[i]));
            dotsHtml += '<li class="slider-nav-item"></li>';
        }

        var $slider = self.$slider.html(itemsHtml);
        self.$items = $slider.children();

        if (options.dots) {
            if (data.length <= 1) {
                dotsHtml = '';
            }
            self.$dots.html(dotsHtml);
            self.$dots.children()
                .eq(options.index)
                .addClass('curr');
        }

        if (self.length < 2) self.loop = false;
        else if (self.width < 30) self.loop = false;

        if (self.loop) {
            $slider.prepend(self.$items.eq(self.length - 1).clone());
            $slider.append(self.$items.eq(0).clone());
            self.$items = $slider.children();
        }
    },

    destroy: function () {
        $(window).off('ortchange', this.adjustWidth);
        self.$el.off('tap');
        this.touch.destroy();
    }
});


export function SliderComponent(options) {
    this.slider = new Slider(options);
    this.$el = this.slider.$el;
}

SliderComponent.prototype.set = function (data) {
    this.slider.set(data.data);
};

export default Slider;
