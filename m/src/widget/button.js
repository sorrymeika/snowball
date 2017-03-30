define(function(require,exports) {
    var $=require('$'),
        bridge=require('bridge'),
        util=require('util');

    exports.sync=function(data) {
        return function(e) {
            var $btn=$(e.currentTarget);
            if(!$btn.hasClass('disabled')) {

                var that=this,
                    val=$btn[0].tagName=="INPUT"?"val":'html';

                if(typeof data==='function')
                    data=data.call(this,e);

                if(!data) return;

                $btn.data('val',$btn[val]())
                $btn.addClass('disabled')[val](data.msg||"请稍候...");

                $.ajax({
                    url: bridge.url(data.url),
                    type: data.type||'POST',
                    dataType: data.dataType||'json',
                    data: data.data,
                    success: function(res) {
                        data.success&&data.success.call(that,res);
                    },
                    error: (data.error||function(res) {
                        sl.tip((res&&res.msg)||"网络错误");
                    }),
                    complete: function() {
                        $btn.removeClass('disabled')[val]($btn.data('val'));
                    }
                });
            }
        }
    }

});