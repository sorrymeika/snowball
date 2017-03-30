var bridge = require('bridge');
var Model = require('core/model2').Model;
var util = require('util');
var Scroll = require('./scroll');
var PhotoViewer = require('./photoViewer');


module.exports = Model.extend({
    el: (<div class="cp_album view active">
        <header>
            <div class="head_back" sn-tap="this.back()"></div>
            <div class="head_title">{album.albumName}</div>
            <div class="head_right" sn-tap="this.complete()">完成</div>
        </header>
        <div class="main" ref="main">
            <ul class="cp_album__images">
                <li sn-repeat="item in thumbnails"><img sn-src="{item.src}" /></li>
            </ul>
        </div>
    </div>),

    back: function () {

    },

    complete: function () {

    },

    pageSize: 50,

    setAlbum: function (album, callback) {
        var self = this;

        self.isLoading = true;

        self.set({
            album: album,
            totalPages: 0
        });

        self.page = 1;

        bridge.assets.thumbnails({
            albumId: album.albumId,
            page: self.page,
            pageSize: self.pageSize
        }, function (res) {
            var total = res.total - res.data.length;
            var images = [];

            for (var i = 0; i < total; i++) {
                images.push({
                    index: i
                });
            }
            images = images.concat(res.data);

            self.set({
                thumbnails: images,
                totalPages: res.totalPages

            }).next(function () {
                self.scroll.scrollTo(0, self.scroll.scrollHeight());
                self.isLoading = false;
            });

            callback && callback();
        });
    },

    initialize: function () {

        this.photoViewer = new PhotoViewer();

        this.photoViewer.$el.appendTo($('body'))

        var self = this;
        var scroll = this.bindScrollTo(this.refs.main).eq(0);
        self.scroll = scroll;

        bridge.assets.albums(function (res) {

            res.data.sort(function (a, b) {
                return a.index > b.index ? 1 : a.index == b.index ? 0 : -1;
            });
            var smartAlbum = res.data[0];

            self.set({
                albums: res.data

            }).setAlbum(smartAlbum, function () {

                scroll.$el.on('scroll', function () {

                    if (!self.isLoading && self.page < self.data.totalPages && scroll.scrollTop() <= Math.max(0, self.refs.main.scrollHeight - self.refs.main.clientHeight * self.page)) {
                        self.page++;
                        self.isLoading = true;

                        var scrollHeight = scroll.scrollHeight()

                        bridge.assets.thumbnails({
                            albumId: self.data.album.albumId,
                            page: self.page,
                            pageSize: self.pageSize

                        }, function (res) {
                            var total = res.total;
                            var images = res.data;
                            var page = self.page;
                            var start = Math.max(0, total - page * self.pageSize);
                            var end = total - (page - 1) * self.pageSize;

                            self.getModel('thumbnails').each(start, end, function (model, i) {
                                model.set(images[i - start]);
                            });

                            self.set({
                                totalPages: res.totalPages
                            });

                            self.isLoading = false;
                        });
                    }
                });

            });



        });

    }

});