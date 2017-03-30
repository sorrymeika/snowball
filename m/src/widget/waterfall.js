define(['$', './../view'], function (require, exports, module) {
    var $ = require('$'),
        view = require('./../view');

    module.exports = view.extend({
        options: {
            itemSelector: null
        },

        columns: [],
        columnsLength: 0,

        initialize: function () {
            var that = this;

            that.adjust();
        },

        append: function (html) {
            this.adjust($(html).appendTo(this.$el));
        },

        adjust: function (selector) {

            var that = this,
                options = that.options,
                items = selector && selector.attr ? selector : that.$(selector || options.itemSelector);

            items.css({ display: 'block' });

            that.imageLoaded(function () {

                var containerWidth = that.$el.width(),
                    columns = that.columns,
                    columnWidth = $.fn.outerWidth ? items.eq(0).outerWidth() : items[0].offsetWidth,
                    columnsLength = Math.floor(containerWidth / columnWidth) || 1,
                    containerHeight = 0;

                if (columnsLength != that.columnsLength) {
                    columns = that.columns = [];
                    for (var i = 0; i < columnsLength; i++) {
                        columns[i] = {
                            index: i,
                            top: 0
                        };
                    }
                    that.columnsLength = columnsLength;
                }

                for (var i = 0, n = items.length; i < n; i += columnsLength) {
                    var arr = [],
                        item;
                    for (var j = 0; j < columnsLength && i + j < n; j++) {
                        item = items.eq(i + j);
                        arr.push({
                            height: item.height(),
                            item: item
                        });
                    }

                    arr.sort(function (a, b) {
                        return a.height < b.height
                    });

                    columns.sort(function (a, b) {
                        return a.top > b.top
                    });

                    for (var j = 0, column; j < arr.length; j++) {
                        column = columns[j];

                        arr[j].item.css({
                            left: column.index * columnWidth,
                            top: column.top
                        });

                        column.top += arr[j].height;

                        if (column.top > containerHeight) {
                            containerHeight = column.top;
                        }
                    }
                }

                that.$el.height(containerHeight);
                items.css({
                    visibility: 'visible',
                    opacity: 1,
                    '-webkit-transform': 'scale(1,1)'
                })

            });

        },

        imageLoaded: function (callback) {

            var imgdefereds = [];
            this.$('img').each(function () {

                if (!this.complete) {
                    var dfd = $.Deferred();
                    $(this).on('load', function () {
                        dfd.resolve();
                    }).on('error', function () {
                        dfd.resolve();
                    });
                    imgdefereds.push(dfd);

                    var src = this.getAttribute('data-src');

                    if (src) {
                        this.src = src;

                    } else if (/MSIE|Trident/.test(navigator.userAgent)) {
                        this.src = this.src;
                    }
                }
            })

            $.when.apply(null, imgdefereds).done(callback);

        }
    });
});