define(function (require,exports,module) {
    var $=require('$');

    var Button=function (container,options) {
        options=$.extend({
            text: "",
            ico: null,//delete,add,modify,view
            disabled: false,
            visible: true,
            click: null
        },options);

        var me=this,
			clickEvents=[],
			value=options.text||options.value;

        me._clickEvents=clickEvents;

        options.click&&clickEvents.push(options.click);

        var button=$("<a class='button'>"+(options.ico?'<em class="ico-'+options.ico+'"></em>':'')+value+"</a>")
			.appendTo(container)
			.click(function () {
			    if(me._disabled) {
			        return;
			    }
			    $.each(clickEvents,function (i,click) {
			        click.call(me);
			    });
			});

        (!options.visible)&&button.hide();

        me._button=button;
        if(options.disabled)
            me.disable();
        else
            me.enable();
    };

    Button.prototype={
        disabled: function () {
            return this._disabled;
        },
        disable: function () {
            this._disabled=true;
            this._button.addClass("disabled");
            return this;
        },
        enable: function () {
            this._disabled=false;
            this._button.removeClass("disabled");
            return this;
        },
        click: function (fn) {
            if(!arguments.length)
                this._button.tigger('click');

            this._clickEvents.push(fn);
        },
        off: function (fn) {
            var clickEvents=this._clickEvents;
            for(var i=clickEvents.length-1;i>=0;i--) {
                (!fn||clickEvents[i]===fn)&&clickEvents.splice(i,1);
            }
        },
        val: function (text) {
            var button=this._button;
            button.contents().last().remove();
            button.append(text);
        }
    };

    var Buttons=function (container,options) {
        var me=this,
			buttons=[];

        if(typeof container=="string")
            container=$(container);

        me._container=container;
        me._buttons=[];

        options&&me.add(options);
    };

    Buttons.prototype={
        add: function (options) {

            var me=this;
            if($.isArray(options))
                $.each(options,function (i,opt) {

                    me.add(opt);
                });
            else
                me._buttons.push(new Button(me._container,options));

            return this;
        },
        items: function () {
            var buttons=this._buttons,
				args=arguments,
				items=new Buttons(this._container);

            $.each($.isArray(args[0])?args[0]:args,function (i,index) {
                items._buttons.push(buttons[index]);
            });

            return items;
        },
        item: function (i) {
            return buttons[i];
        },
        disable: function () {
            var buttons=this._buttons;

            $.each(this._buttons,function (i,button) {
                button.disable();
            });

            return this;
        },
        enable: function () {
            var buttons=this._buttons;

            $.each(this._buttons,function (i,button) {
                button.enable();
            });

            return this;
        }
    }

    Buttons.Single=Button;

    module.exports=Buttons;
});