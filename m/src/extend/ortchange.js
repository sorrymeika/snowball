(function($,undefined) {
    $.mediaQuery={
        ortchange: 'screen and (width: '+window.innerWidth+'px)'
    };

    $(function() {
        $.matchMedia($.mediaQuery.ortchange).addListener(function() {
            $(window).trigger('ortchange');
        });
        $.matchMedia('screen and (height: '+window.innerHeight+'px)').addListener(function() {
            this.append('screen and (height: '+window.innerHeight+'px)');
            $(window).trigger('heightchange');
        });
    })

})(Zepto);