define(function(require,exports,module) {
    var $=require('$');

    var record=(function() {
        var data={},
                id=0,
                ikey='_gid';

        return function(obj,key,val) {
            var dkey=obj[ikey]||(obj[ikey]= ++id),
                    store=data[dkey]||(data[dkey]={});

            val!==undefined&&(store[key]=val);
            val===null&&delete store[key];

            return store[key];
        };
    })(),
    zeptolize=function(name,Class) {
        var key=name.substring(0,1).toLowerCase()+name.substring(1),
            old=$.fn[key];

        $.fn[key]=function(opts) {
            var args=slice.call(arguments,1),
                method=typeof opts==='string'&&opts,
                ret,
                obj;

            $.each(this,function(i,el) {

                // 从缓存中取，没有则创建一个
                obj=record(el,name)||record(el,name,new Class(el,$.isPlainObject(opts)?opts:undefined));

                // 取实例
                if(method==='this') {
                    ret=obj;
                    return false;    // 断开each循环
                } else if(method) {

                    // 当取的方法不存在时，抛出错误信息
                    if(!$.isFunction(obj[method])) {
                        throw new Error('组件没有此方法：'+method);
                    }

                    ret=obj[method].apply(obj,args);

                    // 断定它是getter性质的方法，所以需要断开each循环，把结果返回
                    if(ret!==undefined&&ret!==obj) {
                        return false;
                    }

                    // ret为obj时为无效值，为了不影响后面的返回
                    ret=undefined;
                }
            });

            return ret!==undefined?ret:this;
        };

        $.fn[key].noConflict=function() {
            $.fn[key]=old;
            return this;
        };
    }

    return zeptolize;
});
