import * as util from '../utils';
import { $, reflow } from '../utils';
import { Toucher } from '../widget';

function SelectorItem(options) {
    Object.assign(this, util.pick(options, ['itemHeight', 'template']));
    options = this.options = Object.assign({}, options);

    this.$el = $(this.el);
    this.el = this.$el[0];
    this.$scroller = $('<div class="app-scroller-container app-selector-con" style="width:100%;"></div>').appendTo(this.$el);
    this.scroller = this.$scroller[0];
    this.$content = $('<ul></ul>').appendTo(this.$scroller);

    this.touch = new Toucher(this.$el, {
        divisorY: this.itemHeight
    });

    const context = this;
    this.touch
        .on('start', function () {
            this.maxY = Math.max(context.scroller.offsetHeight - context.el.clientHeight, 0);
        })
        .on('move', function () {
            context.scroller.style.webkitTransform = 'translate3d(' + this.x * -1 + 'px,' + this.y * -1 + 'px,0)';
        })
        .on('stop', function () {
            context.index(Math.round(this.y / context.itemHeight));
        });

    this.set(options.data || []);
    if (options.value) this.val(options.value);
};

SelectorItem.prototype = {
    el: '<div class="app-selector-item"></div>',

    template: util.template('<li><%=$data.label||$data.text%></li>'),

    set: function (data) {
        let html = '';
        data.forEach((item) => {
            html += this.template(item);
        });
        this.data = data;
        this.$content.html(html);
        return this.index(0);
    },

    itemHeight: 30,

    _emitChange: function () {
        if (!this._changeTimer) {
            this._changeTimer = setTimeout(() => {
                this._changeTimer = null;
                this.options.onChange.call(this, this._index, this.selectedData);
            }, 0);
        }
    },

    _index: 0,
    index: function (index) {
        if (typeof index === 'undefined') return this._index;

        if (index >= this.data.length) {
            index = this.data.length - 1;
        }

        if (index != -1) {
            if (this._index != index) {
                this._index = index;
            }
            const y = index * this.itemHeight;
            if (y != this.touch.y) {
                this.touch.scrollTo(0, y, 200);
            }

            if (this.selectedData != this.data[index]) {
                this.selectedData = this.data[index];
                this.options.onChange && this._emitChange();
            }
        }
        return this;
    },

    val: function (key, val) {
        if (val === undefined) {
            val = key;
            key = "value";
        }

        if (typeof val === 'undefined')
            return this.selectedData[key];

        const index = util.indexOf(this.data, key, val);
        index != -1 && this.index(index);

        return this;
    }
};

/* @options = {
    items: [{
        template: '<li><%=text%></li>',
        data: [{
            value: 1,
            text: '1人'
        },{
            value: 2,
            text: '2人'
        }],
        onChange: function(i, selectedData) {
        }
    }],
    complete: function (results=[{value: 1, text: '1人'}]) {
        var data = results[0];
    }
}*/
export default function Selector(options) {
    options = Object.assign({
        complete: function () { },
        items: []
    }, options);

    const $container = $('<div style="position:fixed;top:0px;bottom:0px;left:0px;right:0px;width:100%;background: rgba(0,0,0,0);z-index:1000;display:none;overflow:hidden;"></div>')
        .on('touchmove', false)
        .appendTo('body');

    this.$container = $container;
    this.$mask = $('<div style="position:fixed;top:0px;bottom:0px;right:0px;width:100%;background: rgba(0,0,0,.3);z-index:999;display:none"></div>').appendTo('body');
    this.$el = $('<div class="app-selector-wrap" style="display:none"><div class="app-selector-bar bd_b"><b class="J_Click">完成</b></div><div class="app-selector"></div></div>').appendTo($container);
    this.$selector = this.$el.find('.app-selector');
    this.items = [];

    $container.on('click', (e) => {
        if (e.target === $container[0])
            this.hide();
    });

    if (!Array.isArray(options.items)) {
        options.items = [options.items];
    }

    options.items.forEach((item) => {
        this.add(item);
    });

    const context = this;
    this.$el.on($.fx.transitionEnd, function (e) {
        if (e.target === this) {
            context._visible = context.$el.hasClass('show');
            if (!context._visible) {
                context.$el.hide();
                context.$container.hide();
            } else {
                context.items.forEach(function (item) {
                    item.touch.maxY = Math.max(item.scroller.offsetHeight - item.el.clientHeight, 0);
                    item.touch.scrollTo(0, item._index * item.itemHeight);
                });
            }
        }
    });

    this.$click = this.$el.find('.J_Click')
        .on('click', () => {
            options.complete && options.complete.call(this, this.items.map(item => item.selectedData));
            this.hide();
        });
};

Selector.prototype = {
    _visible: false,

    data: function () {
        return this.items.map((item) => item.selectedData);
    },

    add: function (options) {
        const item = new SelectorItem(options);
        this.items.push(item);
        this.$selector.append(item.$el);
    },

    hide: function () {
        if (this._visible) {
            this.$mask.animate({
                backgroundColor: 'rgba(0,0,0,0)'
            }, 350, () => {
                this.$mask.hide().css({ backgroundColor: 'rgba(0,0,0,.3)' });
            });
            this.$el.removeClass('show');
        }
        return this;
    },

    show: function () {
        if (!this._visible) {
            const $scroll = this.$selector.find('.app-scroller-container').css({ color: "#fff" });

            this.$container.show();
            this.$mask.show();
            this.$el.show();
            reflow($scroll);
            this.$el.addClass('show');

            $scroll.animate({ color: "#333" }, 100, 'ease-out');
        }
        return this;
    },

    destroy: function () {
        this.$el.off($.fx.transitionEnd);
        this.$click.off('click').off('tap');
        this.$mask.remove();
        this.$container.off('tap').remove();
    }
};
