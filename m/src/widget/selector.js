define(function (require, exports, module) {
    var $ = require('$'),
        util = require('util'),
        Touch = require('core/touch');

    var SelectorItem = function (options) {
        var that = this;

        $.extend(this, util.pick(options, ['itemHeight', 'template']));

        if (typeof this.template == 'string') this.template = util.template(this.template);

        options = this.options = $.extend({}, options);
        var data = options.data || [];

        this.$el = $(this.el);
        this.el = this.$el[0];

        this.$scroller = $('<div class="scroller_container selectorcon" style="width:100%;"></div>').appendTo(this.$el);
        this.scroller = this.$scroller[0];
        this.$content = $('<ul></ul>').appendTo(this.$scroller);

        this.set(data);

        if (options.value) this.val(options.value);

        this.touch = new Touch(this.$el, {
            divisorY: this.itemHeight
        });

        this.touch.on('start', function () {
            this.maxY = Math.max(that.scroller.offsetHeight - that.el.clientHeight, 0);

        }).on('move', function () {
            var self = this;
            that.scroller.style.webkitTransform = 'translate3d(' + self.x * -1 + 'px,' + self.y * -1 + 'px,0)';

        }).on('stop', function () {
            that.index(Math.round(this.y / that.itemHeight));
        });

    };

    SelectorItem.prototype = {

        el: '<div class="selector_item"></div>',

        template: util.template('<li><%=text%></li>'),

        /*//覆盖老数据
        @data=[{
            value: 1,
            text: '1人'
        }]*/
        set: function (data) {
            var that = this;
            var html = '';
            $.each(data, function (i, item) {
                html += that.template(item);
            });

            this.data = data;
            this.$content.html(html);
            return this.index(0);
        },

        itemHeight: 30,

        _changeNextTick: function () {
            var self = this;
            if (!self._nextTick) {
                self._nextTick = setTimeout(function () {
                    self._nextTick = null;
                    self.options.onChange.call(self, self._index, self.selectedData)
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
                    var y = index * this.itemHeight;
                    y != this.y && this.touch.scrollTo(0, y, 200);
                }

                if (this.selectedData != this.data[index]) {
                    this.selectedData = this.data[index];
                    this.options.onChange && this._changeNextTick();
                }
            }
            return this;
        },

        val: function (key, val) {

            if (val === undefined) val = key, key = "value";

            if (typeof val === 'undefined')
                return this.selectedData[key];

            var index = util.indexOf(this.data, key, val);

            index != -1 && this.index(index);

            return this;
        }
    };

    /*@options = {
        options: [{
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
    var Selector = function (options) {
        options = $.extend({
            complete: function () { },
            options: []
        }, options);

        var that = this;
        var $container = $('<div style="position:fixed;top:0px;bottom:0px;left:0px;right:0px;width:100%;background: rgba(0,0,0,0);z-index:1000;display:none;overflow:hidden;"></div>').on('touchmove', false).appendTo('body');
        this.$container = $container;

        this.$mask = $('<div style="position:fixed;top:0px;bottom:0px;right:0px;width:100%;background: rgba(0,0,0,.3);z-index:999;display:none"></div>').appendTo('body');
        this.$el = $('<div class="selectorwrap" style="display:none"><div class="selectorbar"><b class="js_click">完成</b></div><div class="selector"></div></div>').appendTo($container);
        this.$selector = this.$el.find('.selector');
        this.selectors = [];

        $container.on('tap', function (e) {
            if (e.target === $container[0])
                that.hide();
        });

        if (!$.isArray(options.options)) {
            options.options = [options.options];
        }

        $.each(options.options, function (i, item) {
            that.add(item);
        });

        this.$el.on($.fx.transitionEnd, function (e) {

            if (e.target == this) {
                that._visible = that.$el.hasClass('show');
                if (!that._visible) {
                    that.$el.hide();
                    that.$container.hide();
                } else {
                    that.each(function () {
                        this.touch.maxY = Math.max(this.scroller.offsetHeight - this.el.clientHeight, 0);
                        this.touch.scrollTo(0, this._index * this.itemHeight);
                    });
                }
            }
        });

        this.$click = this.$el.find('.js_click').on('tap', function () {
            var result = [];
            $.each(that.selectors, function (i, sel) {
                result.push(sel.selectedData);
            });

            options.complete && options.complete.call(that, result);
            that.hide();
        });
    };

    Selector.prototype = {
        _visible: false,
        eq: function (i) {
            return this.selectors[i];
        },

        data: function () {
            var result = [];
            $.each(this.selectors, function (i, sel) {
                result.push(sel.selectedData);
            });
            return result;
        },

        each: function (fn) {
            $.each(this.selectors, fn);
        },

        add: function (options) {
            var sel = new SelectorItem(options);
            this.selectors.push(sel);
            this.$selector.append(sel.$el);
        },

        hide: function () {
            var that = this;

            if (this._visible) {
                that.$mask.animate({
                    backgroundColor: 'rgba(0,0,0,0)'
                }, 350, function () {
                    that.$mask.hide().css({ backgroundColor: 'rgba(0,0,0,.3)' });
                });

                this.$el.removeClass('show');
            }

            return that;
        },

        show: function () {
            var that = this;

            if (!that._visible) {
                var $scroll = that.$selector.find('.scroller_container').css({ color: "#fff" });
                that.$container.show();
                that.$mask.show();
                that.$el.show();
                $scroll[0].clientHeight;

                that.$el.addClass('show');

                $scroll.animate({ color: "#333" }, 100, 'ease-out');
            }

            return that;
        },
        destroy: function () {
            this.$el.off($.fx.transitionEnd);
            this.$click.off('click').off('tap');
            this.$mask.remove();
            this.$container.off('tap').remove();
        }
    };

    return Selector;
});
