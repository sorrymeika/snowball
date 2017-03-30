define(function (require,exports,module) {
    var $=require('jquery'),
        util=require('lib/util'),
        drag=require('lib/drag'),
        tmpl=require('lib/tmpl'),
        isIE6=util.isIE6,
        win=$(window),
        doc=$(document),
        easing=require('lib/easing');

    var maskTmpl='<div class="J_Mask" style="opacity:.3;filter:alpha(opacity=30);position:absolute;z-index:99;top:0px;left:0px;background:#000;"></div>';

    if(isIE6)
        maskTmpl+='<iframe class="J_Mask" style="opacity:0;filter:alpha(opacity=0);position:absolute;z-index:98;top:0px;left:0px;" frameborder="0" scrolling="no"></iframe>';

    var Mask={
        maskTmpl: maskTmpl,
        resize: function () {
            var me=this;
            me._mask&&me._mask.css({
                width: doc.outerWidth(),
                height: doc.outerHeight()
            });
        },
        _visible: false,
        show: function () {
            var me=this;
            if(me._visible) return;
            me._visible=true;

            if(!me._mask) {
                var mask=$('.J_Mask');
                me._mask=mask.length?mask:$(me.maskTmpl).appendTo(document.body);
            }
            win.on('resize',$.proxy(me.resize,me));

            me._mask.css({
                width: doc.outerWidth(),
                height: doc.outerHeight()
            }).fadeIn();
        },
        hide: function () {
            var me=this;
            if(me._visible==false) return;

            me._mask&&me._mask.hide();
            win.off('resize',me.resize);
            me._visible=false;
        }
    };

    function Dialog(options) {
        var me=this;

        if(options||!me._options)
            me._options=$.extend({
                title: '',
                width: 350,
                height: null,
                drag: true,
                content: '',
                onContentLoad: null
            },options);

        me._init();
    };

    Dialog.prototype={
        _init: function () {
            var me=this,
                options=me._options,
                width=options.width,
                templa='<div class="dialog" style="z-index:100;display:none"><div class="dialog_hd"><i class="dialog_close">X</i></div><div class="dialog_bd"></div></div>',
                container=$(templa).css({
                    width: width
                }).appendTo(document.body),
                title=container.find('.dialog_hd').append('<span>'+options.title+'</span>'),
                body=container.find('.dialog_bd'),
                content=$('<div class="dialog_content"></div>').appendTo(body);

            container.addClass('dialog_fixed');
            options.drag?drag(title,container):title.css({ cursor: 'default' });

            content.append(options.content).children().show();
            title.find('.dialog_close').click(function () {
                if(options.onCloseClick&&options.onCloseClick.call(me)===false) return;
                me.hide();
            });

            me._title=title.find('span');
            me.container=container;
            me._content=content;
            me._body=body;

            options.height&&content.css({ overflowY: 'auto',height: options.height });

            onContentLoad=options.onContentLoad;
            if(onContentLoad) onContentLoad.call(this);
        },
        translate: function (dialog) {
            var me=this,
                container=me.container,
                content=me._content,
                body=me._body,
                m_width=parseInt(container.css('width')),
                m_height=parseInt(container.css('height')),
                d_container=dialog.container.css({ visibility: 'hidden',display: 'block' }),
                d_content=dialog.content(),
                d_width=parseInt(d_container.css('width')),
                d_height=parseInt(d_container.css('height')),
                d_left=(win.width()-d_width)/2,
                d_top=(win.height()-d_height)/2;

            content.css({
                width: content.css('width'),
                'float': 'left'
            })

            d_content.css({
                width: d_content.css('width'),
                'float': 'left'
            });

            var isPrev=me._translatePopup==dialog,
                marginStart,
                marginEnd,
                appendFunc;

            if(isPrev) {
                marginStart=m_width* -1;
                marginEnd=0;
                appendFunc='prepend';
            } else {
                marginStart=0;
                marginEnd=m_width* -1;
                appendFunc='append';
                dialog._translatePopup=me;
            }
            me._translatePopup=null;

            body.css({
                width: d_width+m_width,
                'margin-left': marginStart
            })[appendFunc](d_content);

            container
                .css({
                    overflow: 'hidden',
                    height: m_height
                })
                .animate({
                    left: d_left,
                    top: d_top,
                    width: d_width,
                    height: d_height
                },{
                    duration: 300,
                    easing: 'easeOutQuad',
                    step: function (now,fx) {
                        if(fx.prop=='left') {
                            body.css({
                                'margin-left': (new Date().getTime()-fx.startTime)/300*(marginEnd-marginStart)+marginStart
                            })
                        }
                    },
                    complete: function () {
                        d_content.css({
                            width: '',
                            'float': ''
                        }).appendTo(dialog._body);

                        d_container.css({
                            left: d_left,
                            top: d_top,
                            visibility: ''
                        });
                        dialog._visible=true;

                        container.css({
                            width: m_width,
                            height: '',
                            overflow: '',
                            display: 'none'
                        });
                        me._visible=false;

                        content.css({
                            width: '',
                            'float': ''
                        });
                        body.css({ width: '',marginLeft: '' });
                    }
                });
        },
        find: function (selector) {
            return this._content.find(selector);
        },
        content: function (content) {
            var me=this;
            if(typeof content!=='undefined') {
                me._content.html('').append(content);
                return me;
            }

            return me._content;
        },
        center: function () {
            var me=this;
            var container=me.container;
            if(container.css('display')!='none') {
                if(me._centerTimer) clearTimeout(me._centerTimer);
                me._centerTimer=setTimeout(function () {
                    container.animate({
                        left: (win.width()-container.outerWidth())/2,
                        top: Math.max(0,(win.height()-container.outerHeight())/2),
                        opacity: 1
                    },300,function () {
                        me._centerTimer=null;
                    });
                },200);
            }
            return me;
        },
        _visible: false,
        show: function () {
            var me=this,
                container=this.container;

            if(!me._visible) {
                me._visible=true;

                win.on('resize',$.proxy(me.center,me));

                Mask.show();
                container.css({
                    top: -9999,
                    left: -9999,
                    display: 'block',
                    opacity: 0
                }).css({
                    left: (win.width()-container.outerWidth())/2,
                    top: win.height()/2-container.height()
                });

                me.center();
            }

            return me;
        },
        hide: function () {
            var me=this;

            if(me._visible) {
                me._visible=false;

                win.off('resize',me.center);
                me.container.fadeOut(200);

                $('body > .dialog:visible').length<=1&&Mask.hide();
            }

            return me;
        },
        title: function (title) {
            if(typeof title!='undefined') {
                this._title.html(title);
                return this;
            }

            return this._title.html();
        }
    };

    var Form=require('lib/form');

    function FormDialog(options) {
        var me=this;

        me._options=$.extend({},options);

        Dialog.call(me);

        delete me._options.title;
        Form.call(me,me._content);
    };

    $.extend(FormDialog.prototype,Form.prototype,Dialog.prototype,{
        constructor: FormDialog
    });

    function IFrame(options) {
        var defaults={
            title: '',
            width: 450,
            height: 350,
            url: ''
        };
        Dialog.call(this,$.extend(defaults,options));
    };

    $.extend(IFrame.prototype,Dialog.prototype);

    var iframeGuid=0;
    IFrame.prototype._init=function () {
        var options=this._options;
        this.frameName='__popup_'+iframeGuid;
        var iframe=$(tmpl('<iframe frameborder="0" name="'+this.frameName+'" scrolling="auto" src="${url}" width="${width}" height="${height}"></iframe>',options));
        this.frame=iframe;
        options.content=iframe;
        options.width+=20;
        Dialog.prototype._init.call(this,options);

        this._content.css('overflowY','hidden');
    };

    IFrame.prototype.constructor=IFrame;
    IFrame.prototype.load=function (url) {
        window.open(url,this.frameName);
        return this;
    };
    IFrame.prototype.resize=function (width,height) {
        var that=this,
            container=this.container,
            frame=this.frame;

        $().add(this._content).add(this.frame).animate({
            width: width,
            height: height
        },{
            duration: 400,
            step: function (now,fx) {
                container.css({
                    width: parseInt(frame.width())+20
                }).css({
                    left: (win.width()-container.outerWidth())/2,
                    top: (win.height()-container.outerHeight())/2
                });
            }
        });
        return this;
    };

    module.exports={
        Dialog: Dialog,
        IFrame: IFrame,
        Form: FormDialog
    };
});