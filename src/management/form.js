define(function (require,exports,module) {
    var $=require('$'),
        util=require('util'),
        V=require('./validation'),
        Buttons=require('./buttons');

    var ControlBase=function (form,options) {
        var me=this,
            opt=$.extend(true,{
                label: '',
                labelVAlign: 'center',
                name: '',
                type: 'text'
            },options);

        if(typeof form=='string') form=$(form);

        var tbody=form.find("tbody");
        if(!tbody.length) tbody=$('<table width="100%"><tbody></tbody></table>').appendTo(form).find('tbody');

        me.type=type;
        me.name=name;
    }

    ControlBase.prototype={
        create: function () {
        }
    };

    var Control=function (form,options) {
        var me=this,
            opt=$.extend(true,{
                label: '',
                labelVAlign: 'center',
                name: '',
                type: 'text',
                value: '',
                validation: null,
                render: null,
                width: null,
                height: null,
                options: null,
                visible: true
            },options);

        if(typeof form=='string') form=$(form);

        var tbody=form.find("tbody");
        if(!tbody.length) tbody=$('<table width="100%"><tbody></tbody></table>').appendTo(form).find('tbody');

        var inputValid=opt.validation||util.pick(opt,['emptyAble','emptyText','regex','regexText']),
            name=opt.name,
            input,
            type=opt.type,
            value=opt.value,
            emptyAble=inputValid.emptyAble!==false;

        me.type=type;
        me.name=name;

        if(type=='hidden') {
            input=$('<input name="'+name+'" type="hidden"/>').appendTo(form).val(value);
        } else if(type=='grid'||type=='buttons') {
            var label=opt.label,
                tr=$('<tr></tr>')
                    .attr("row-name",name)
                    .appendTo(tbody),
                td=$('<td colSpan="2"></td>').appendTo(tr);

            if(!opt.visible) tr.hide();

            me._row=tr;

            if(type=='grid') {
                td.css({ paddingTop: 0 });
                seajs.use('lib/grid',function (Grid) {
                    me._input=new Grid(td,opt.options);
                });
            } else {
                td.addClass('toolbar');
                me._input=new Buttons(td,opt.options);
            }
            return;

        } else {

            var label=opt.label,
                tr=$('<tr><th>'+label+(emptyAble?'':'<i>*</i>')+'</th></tr>')
                    .attr("row-name",name)
                    .appendTo(tbody),
                td=$("<td></td>").appendTo(tr);

            me._row=tr;

            if(!opt.visible) tr.hide();


            if(opt.labelVAlign=="top") {
                tr.find('th').addClass('vtop');
            }

            if($.isFunction(opt.render)) {
                input=opt.render.call(me,td);
                if(typeof input=="string")
                    td.append(input);
                input=td.children();
                me.type='render';
            } else if(type=="label") {
                input=$('<div></div>').html(value).appendTo(td);
                opt.width&&input.css({ width: opt.width });
                opt.height&&input.css({ height: opt.height });
            } else {
                if(type=="html"||type=="editor") {
                    var htmlContainer=$('<div style="position: relative;margin-bottom:6px;"></div>').appendTo(td);
                    input=$('<textarea name="'+name+'" style="width: 600px; height: 400px; visibility: hidden;"></textarea>').appendTo(htmlContainer).val(value);
                    opt.width&&input.css({ width: opt.width });
                    opt.height&&input.css({ height: opt.height });

                    inputValid&&!inputValid.position&&(inputValid.position='dock-bottom:this.parent()');

                    seajs.use('kindeditor/kindeditor-min',function (K) {
                        var editor=K.create(input[0],$.extend({
                            uploadJson: "/manage/upload",
                            allowFileManager: false,
                            items: ['source','fontname','fontsize','|','forecolor','hilitecolor','bold','italic','underline',
                'removeformat','|','justifyleft','justifycenter','justifyright','insertorderedlist',
                'insertunorderedlist','|','emoticons','image','link']
                        },opt.options));
                        me.editor=editor;
                    });
                } else {
                    if(opt.type=="textarea") {
                        input=$('<textarea name="'+name+'" class="text"></textarea>');
                    } else if(opt.type=="calendar") {
                        input=$('<input name="'+name+'" class="text_normal" type="text"/>');
                        seajs.use(['lib/jquery.datepicker','lib/jquery.datepicker.css'],function () {
                            input.datePicker($.extend(opt.options,{
                                clickInput: true,
                                verticalOffset: 4
                            }));
                        });
                    } else if(opt.type=="select") {
                        input=$('<select name="'+name+'"></select>');

                        var addOption=function (text,value) {
                            if(typeof value==='undefined') {
                                if($.isArray(text))
                                    $.each(text,function (j,selopt) {
                                        addOption(selopt);
                                    });
                                else
                                    addOption(text.text,text.value);
                            } else
                                input.each(function () {
                                    this.options.add(new Option(text,value));
                                });
                        }
                        me.add=addOption;
                        opt.options&&addOption(opt.options);

                    } else {
                        input=$('<input type="'+type+'" name="'+name+'"'+(opt.className?' class="'+opt.className+'"':opt.type=='text'?' class="text"':opt.type=='password'?' class="text_normal"':opt.type=='number'?' class="text_normal"':'')+'/>');
                    }
                    input.appendTo(td).val(value);

                    opt.width&&input.css({ width: opt.width });
                    opt.height&&input.css({ height: opt.height });
                }
            }
        }

        if(opt.events) {
            $.each(opt.events,function (evt,f) {
                var arr=evt.split(' '),
                    events=arr.shift();

                events=events.replace(/,/g,' ');

                f=$.isFunction(f)?f:opt[f];

                if(arr.length>0&&arr[0]!=='') {
                    input.delegate(arr.join(' '),events,$.proxy(f,me));
                } else {
                    input.bind(events,$.proxy(f,me));
                }
            });
        }

        me._input=input.attr('control-name',name);

        if(inputValid) {
            var compare=inputValid.compare;
            if(compare&&typeof compare=="string"&&!/^#|^\./.test(compare))
                inputValid.compare=form.find('[control-name="'+compare+'"]');

            me._validation=new V.Single(input,inputValid);
        }
    };

    Control.prototype={
        hide: function () {
            var row=this._row;
            row&&row.hide();
            return this;
        },
        show: function () {
            var row=this._row;
            row&&row.show();
            return this;
        },
        control: function () {
            var control=this.type=="editor"?this.editor:this._input,
                args=Array.apply([],arguments);

            if(args.length) {
                var action=control[args.shift()];
                if($.isFunction(action)) {
                    action=action.apply(control,args);
                    if(typeof action!='undefined'&&action!=control)
                        return action;

                } else if(typeof action!='undefined')
                    return action;
            }

            return this;
        },
        val: function (val) {
            var input=this._input;

            if(!input) return;
            if(!arguments.length) return input.val();

            input.val(val);
            return this;
        },
        html: function (val) {
            var input=this._input;
            if(!input) return;
            if(typeof val==="undefined") return input.html();

            input.html(val);
            return this;
        }
    };

    var Form=function (container,options) {
        var me=this;

        if(options||!me._options)
            me._options=$.extend({
                title: '',
                url: '',
                controls: [],
                buttons: []
            },options);

        me._validations=new V();
        me._controls={};

        options=me._options;
        container=$(container);

        var title=options.title&&$('<h1>'+options.title+'</h1>').appendTo(container),
            form=$('<form action="'+options.url+'" method="post" enctype="multipart/form-data" class="form"><table width="100%"><tbody></tbody></table></form>').appendTo(container),
            tbody=form.find('tbody');

        me._form=form;
        me._formContainer=tbody;

        $.each(options.controls,function (i,inputopt) {
            if(typeof i==="string"&&!inputopt.name) inputopt.name=i;
            me.add(inputopt);
        });

        if(options.data)
            $.each(options.data,function (name,inputopt) {
                inputopt.name=name;
                me.add(inputopt);
            });

        me.buttons=new Buttons($('<div class="action"></div>').appendTo(container),options.buttons);
    };

    Form.prototype={
        add: function (inputopt) {
            var me=this,
                control=new Control(me._form,inputopt);
            me._controls[inputopt.name]=control;
            control._validation&&me._validations.add(control._validation);
            return me;
        },
        serialize: function () {
            return this._form.serialize();
        },
        editor: function (name) {
            return this._controls[name].editor;
        },
        find: function (selector) {
            return this._form.find(selector);
        },
        button: function (index) {
            return this.buttons[index];
        },
        control: function () {
            var args=Array.apply([],arguments),
                name=args.shift(),
                control=this._controls[name];

            if(args.length) {
                var actionName=args.shift(),
                    action=control[actionName];

                if(typeof action=="undefined") {
                    action=control.control;
                    args.splice(0,0,actionName);
                }

                action=action.apply(control,args);
                if(typeof action!="undefined"&&action!=control) return action;
                return this;
            }
            return control;
        },
        validate: function (callback) {
            var me=this;

            if(!me._validations) {
                callback.call(this,true);
                return;
            }

            $.each(me._controls,function (name,item) {
                if(item.type=="html"||item.type=="editor") {
                    item.val(item.editor.html());
                }
            });
            me._validations.validate(callback);
        },
        submit: function (url,fn) {
            var me=this,
                options=me._options;

            var settings=url&&typeof url==="object"?$.extend({
                url: options.url,
                validate: function () {
                    return true;
                },
                beforeSend: $.noop,
                success: $.noop,
                error: $.noop
            },url):{
                url: $.isFunction(url)&&options.url||url,
                success: fn||!fn&&$.isFunction(url)&&url
            };

            me.validate(function (validRes) {

                if(!validRes||(settings.validate&&!settings.validate())) {
                    settings.error&&settings.error.call(me,'表单验证失败');
                } else {
                    settings.beforeSend&&settings.beforeSend.call(me);
                    if(me._form.has('[type="file"]').length>0) {
                        me._form.attr('action',settings.url);

                        util.submitForm(me._form,function (data) {
                            settings.success&&settings.success.call(me,data)
                        });
                    } else {
                        $.ajax({
                            url: settings.url,
                            type: 'post',
                            dataType: 'json',
                            data: me.serialize(),
                            success: function (data) {
                                settings.success&&settings.success.call(me,data)
                            },
                            error: function (xhr) {
                                settings.error&&settings.error.call(me,xhr);
                            }
                        });
                    }
                }

            });
        },
        reset: function () {
            this._form[0].reset();

            $.each(this._controls,function (name,item) {
                if(item.type=="html"||item.type=="editor") {
                    item.editor.html("");
                    item.val("");
                }
            });

            this._validations.hide();

            return this;
        }
    };

    Form.Control=Control;

    $.extend($.fn,{
        form: function (options) {
            return new Form(this,options)
        }
    });

    module.exports=Form;
});