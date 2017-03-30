define(function (require,exports,module) {
    var $=require('jquery');

    function drag(starter,dragger) {
        if(typeof starter=='string') starter=$(starter);
        if(typeof dragger=='string') dragger=$(dragger);

        var move;

        starter.on('mousedown',function (e) {
            var type=dragger.css('position')=='fixed'?'offset':'page',
                startX=e.pageX,
                startY=e.pageY,
                left=parseInt(dragger.css('left')),
                top=parseInt(dragger.css('top'));

            move&&$(document).off('mousemove',move);

            move=function (e) {
                dragger.css({
                    left: left+e.pageX-startX,
                    top: top+e.pageY-startY
                });
            };

            $(document).on('mousemove',move);
        })
        .on('mouseup',function () {
            $(document).off('mousemove',move);
            move=null;
        });
    };

    module.exports=drag;
});