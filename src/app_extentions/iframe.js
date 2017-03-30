

exports.extendTo = function (Application) {

    Application.prototype.createIFrame = function ($container) {
        var $iframe = $('<iframe width="' + window.innerWidth + 'px" frameborder="0" />').appendTo($container);
        var iframeWin = $iframe[0].contentWindow;
        var iframeDoc = iframeWin.document;
        var self = this;

        $(iframeDoc.body).on('click', 'a[href]', function (e) {
            var target = $(e.currentTarget);
            var href = target.attr('href');

            if (!/^(http\:|https\:|javascript\:|mailto\:|tel\:)/.test(href)) {
                e.preventDefault();
                if (!/^#/.test(href)) href = '#' + href;

                target.attr('back') != null ? self.back(href) : self.forward(href);

            } else if (sl.isInApp && href.indexOf('http') == 0) {
                bridge.openInApp(href);
            }
            return false;
        });

        var ret = {
            $el: $iframe,
            window: iframeWin,
            document: iframeDoc,
            html: function (content) {

                iframeDoc.body.innerHTML = '<style>p{ padding:0;margin:0 0 10px 0; }img{width:100%;height:auto;display:block;}</style>' + content;

                $iframe.css({
                    height: iframeDoc.documentElement.scrollHeight
                });

                [].forEach.call(iframeDoc.querySelectorAll('img'), function (img) {
                    img.style.width = "100%";
                    img.style.height = "auto";
                    img.onload = function () {
                        $iframe.css({
                            height: iframeDoc.documentElement.scrollHeight
                        });
                    }
                })
            }
        }

        return ret;
    }

    return Application;
}
