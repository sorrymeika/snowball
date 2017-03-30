define(['$','./linklist'],function (require,exports,module) {

    var $=require('$');
    var LinkList=require('./linklist');

    function ImageCanvas(canvas) {
        var that=this;

        this.canvas=canvas;
        this.context=canvas.getContext('2d');

        this.images=new LinkList();

        canvas.width=window.innerWidth;
        canvas.height=window.innerHeight;

        $(window).on('ortchange',function () {
            canvas.width=window.innerWidth;
            canvas.height=window.innerHeight;
            that.draw();
        });

        window.ctx=this.context;
    }

    ImageCanvas.prototype={
        clearRect: function () {
            this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
        },

        draw: function () {
            var that=this,
                index,
                ctx=that.context;

            that.clearRect();

            this.images.each(function (imageList) {
                index=0;

                imageList.each(function (data) {
                    var item=this;
                    item.index=index;

                    var imageTop=imageList.marginTop+item.index*(imageList.marginTop+imageList.height),
                        top=imageTop-imageList.scrollTop,
                        y=imageList.scrollTop-imageTop,
                        sy;

                    if(top+imageList.height>=0) {
                        y=y<=0?0:y;

                        if(!item.img) {
                            item.img=new Image();
                            item.img.onload=function () {
                                sy=y*item.img.height/imageList.height;
                                ctx.drawImage(item.img,0,sy,item.img.width,item.img.height-sy,imageList.left,imageList.top+(top<0?0:top),imageList.width,imageList.height-sy);
                                item.loaded=true;
                            }
                            item.img.src=data;

                        } else if(item.loaded) {
                            sy=y*item.img.height/imageList.height;

                            ctx.drawImage(item.img,0,sy,item.img.width,item.img.height-sy,imageList.left,imageList.top+(top<0?0:top),imageList.width,imageList.height-y);
                        }
                    }

                    index++;
                });

            });
        },

        add: function (imageList) {
            var list=new LinkList();

            list.scrollTop=imageList.scrollTop||0;
            list.left=imageList.left||0;
            list.top=imageList.top||0;
            list.width=imageList.width||0;
            list.height=imageList.height||0;
            list.marginTop=imageList.marginTop||0;

            for(var i=0,item,src,n=imageList.list.length;i<n;i++) {
                src=imageList.list[i];

                item=list.append(src);
            }

            this.images.append(list);

            return list;
        }
    }


    module.exports=ImageCanvas;
});
