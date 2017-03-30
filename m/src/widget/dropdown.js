define(['$','./../view','util'],function(require,exports,module) {
    var $=require('$'),
        util=require('util'),
        view=require('./../view');

    var Dropdown=view.extend({
        template: util.template('<div class="dropdown hide"><ul class="dropdown_bd js_dropdown"><%for(var i=0,n=data.length,item;i<n;i++) {%><li><%=item.text%></li><%}%></ul></div>'),
        events: {
            'tap .js_dropdown>li': function(e) {
                var $target=$(e.currentTarget);

                $target.addClass('curr').siblings('.curr').removeClass('curr');
                this.hide();
                this.index=$target.index();
                this.trigger('Change',this.index,this.options.data[this.index]);
            }
        },
        index: 0,
        options: {
            onChange: null,
            data: [],
            isFixed: false,
            attacher: null
        },
        initialize: function() {
            var that=this;

            that.setElement(that.template(that.options))

            if(that.options.isFixed) that.$el.css({ position: 'fixed' });
            that.$el.on($.fx.transitionEnd,function() {
                if(that.$el.hasClass('hide')) that.$el.hide();
            })
            .appendTo(document.body);

            that.on('Hide',function() {
                this.$el.removeClass('visible');
            });

            that.$list=that.$('.js_dropdown');
            that.$attacher=$(that.options.attacher);

            that.$list.children('li').eq(that.index).addClass('curr');

            that.mask=$('<div class="winheight" style="position:fixed;top:0px;bottom:0px;right:0px;width:100%;background:rgba(0,0,0,0);z-index:2000;display:none"></div>').on('tap click touchend touchmove touchstart',function(e) {
                e.preventDefault();
            })
            .appendTo(document.body);

            that.listenTo(that.$attacher,'tap',function() {
                this.$attacher.addClass('visible');
                this.show();
            }).listenTo(that.mask,'tap',function() {
                this.hide();
            });

            if(that.options.onChange) that.on('Change',that.options.onChange);
        },

        show: function() {
            var that=this,
                pos=that.$attacher.offset();

            that.$el.show().removeClass('hide');
            that.el.clientWidth;

            that.mask.show();
            that.pos(pos.left+(that.$attacher.width()-that.$el.width())/2,pos.top+that.$attacher.height());
        },

        hide: function() {
            var that=this;

            that.$el.addClass('hide');
            that.mask.hide();
            that.trigger('Hide');
        },

        render: function() {
        },

        pos: function(x,y) {
            var that=this;

            that.$el.css({
                top: y,
                left: x
            });
        }
    });

    return Dropdown;
});
