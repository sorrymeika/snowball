(function($,undefined) {

    $.matchMedia=(function() {
        var mediaId=0,
            cls='sl-media-detect',
            transitionEnd=$.fx.transitionEnd,
            cssPrefix=$.fx.cssPrefix,
            $style=$('<style></style>').append('.'+cls+'{'+cssPrefix+'transition: width 0.001ms; width: 0; position: absolute; clip: rect(1px, 1px, 1px, 1px);}\n').appendTo('head');

        return function(query) {
            var id=cls+mediaId++,
                $mediaElem,
                listeners=[],
                ret,
                width=1,
                queries=[],
                skip=0,
                append=function(query,isSkip) {
                    if(queries.indexOf(query)== -1) {
                        queries.push(query);
                        $style.append('@media '+query+' { #'+id+' { width: '+width+'px; } }\n');
                        width++;

                        if(typeof isSkip==='undefined'||isSkip)
                            skip++;
                    }
                };

            append(query,false);

            $mediaElem=$('<div class="'+cls+'" id="'+id+'"></div>')
                .appendTo('body')
                .on(transitionEnd,function() {
                    if(skip>0) {
                        skip--;
                        return;
                    }
                    ret.matches=$mediaElem.width()===1;
                    $.each(listeners,function(i,fn) {
                        $.isFunction(fn)&&fn.call(ret,ret);
                    });
                });

            ret={
                append: append,
                matches: $mediaElem.width()===1,
                media: query,
                addListener: function(callback) {
                    listeners.push(callback);
                    return this;
                },
                removeListener: function(callback) {
                    var index=listeners.indexOf(callback);
                    ~index&&listeners.splice(index,1);
                    return this;
                }
            };

            return ret;
        };
    } ());

})(Zepto);
