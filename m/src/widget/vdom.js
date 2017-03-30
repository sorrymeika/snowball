define(['$','./linklist'],function (require,exports,module,undefined) {

    var $=require('$');
    var LinkList=require('./linklist');

    var fn;

    var hideDom=function () {
        this.$el.addClass('virtualdom-hide');
    };

    var showDom=function () {
        this.$el.removeClass('virtualdom-hide');
    }

    //VirtualDom相当于一个Node或组件
    //只有VirtualDom有draw方法
    //DomList相当于一个ScrollView，控制列表中的Node或VirtualDom的位置
    //VirtualDom只能创建和追加DomList
    //DomList只能创建和追加VirtualDom或Node
    //Node就是一个Element
    var VirtualDom=function (el) {
        this.$el=$(el);
        this.el=this.$el[0];

        LinkList.apply(this);
    }

    VirtualDom.prototype=fn=Object.create(LinkList.prototype);

    fn.draw=function () {
        var that=this,
            index,
            showFlag,
            top,
            nodeTop,
            nodeListHeight;

        that.each(function (nodeList) {

            index=0;
            showFlag=false;
            nodeTop=0;
            nodeListHeight=nodeList.height;

            if(nodeList.$el.hasClass('virtualdom-hide')) { return; }
            //if(nodeList.el.style.display=='none') nodeList.el.style.display='';

            var node,
                isAutoHeight;

            nodeList.each(function (data) {
                node=this;

                isAutoHeight=node.height=='auto'||node.height===''||node.height===undefined;

                node.index=index;
                nodeTop+=node.marginTop;
                top=nodeTop-nodeList.scrollTop;

                if(isAutoHeight||(top+node.height>0&&top<nodeListHeight)) {
                    if(isAutoHeight&&top>=nodeListHeight) {
                        if(node.isShow) node.$el.css({ '-webkit-transform':'translate(0px,'+top+'px) translateZ(0)' }),node.isShow=false;

                    } else {
                        if(!node.el) {
                            node.$el=$(data).css({ position: 'absolute',marginTop: 0,top: 0,left: 0,height: node.height,overflow: 'hidden', });
                            node.$el.appendTo(nodeList.$el);
                            node.el=node.$el[0];

                        } else if(!node.isShow) {
                            node.isShow=true;
                        }

                        if(!node.$el.hasClass('virtualdom-hide')) {
                            showFlag=true;
                            node.$el.css({ '-webkit-transform':'translate(0px,'+top+'px) translateZ(0)' });

                            if(isAutoHeight) {
                                offsetHeight=node.el.offsetHeight;
                                nodeTop+=offsetHeight!=0?offsetHeight+node.marginBottom:0;
                            } else {
                                nodeTop+=node.height+node.marginBottom;
                            }
                        }
                    }

                } else {
                    nodeTop+=node.height+node.marginBottom;

                    if(node.el&&node.isShow) node.$el.css({ '-webkit-transform':'translate(0px,'+top+'px) translateZ(0)' }),node.isShow=false;
                }

                index++;
            });

            if(!showFlag) {
                //nodeList.$el.hide();
            }

        });
    };

    fn.create=function (nodeList) {
        return new DomList(nodeList);
    };

    fn.add=function (nodeList) {
        var domList=new DomList(nodeList);
        this.append(domList)

        domList.$el.appendTo(this.el);

        return domList;
    };

    fn.hide=hideDom;
    fn.show=showDom;

    var DomList=function (nodeList) {
        var that=this,
            children=nodeList.children;

        LinkList.apply(that);

        that.scrollHeight=0;
        that.scrollTop=nodeList.scrollTop||0;
        that.left=nodeList.left||0;
        that.top=nodeList.top||0;
        that.width=nodeList.width||(window.innerWidth-that.left);
        that.height=nodeList.height||(window.innerHeight-that.top);

        that.el=document.createElement('DIV');
        that.el.className='virtualdom';
        that.el.style.cssText='-webkit-transform:translate('+that.left+'px,'+that.top+'px) translateZ(0);width:'+that.width+'px;overflow:hidden;height:'+that.height+'px';
        that.$el=$(that.el);

        that.add(children.nodes,children.marginTop,children.marginRight,children.marginBottom,children.marginLeft,children.width,children.height);
    }

    fn=DomList.prototype=Object.create(LinkList.prototype);

    fn.hide=hideDom;
    fn.show=showDom;

    fn.add=function (nodes,marginTop,marginRight,marginBottom,marginLeft,width,height) {
        if(!nodes) return null;

        var args=arguments.length,
            length=nodes.length,
            node,
            isVDom;

        if(length===undefined)
            nodes=[nodes];

        if(args==3) {
            width=marginTop;
            height=marginBottom;
        }

        for(var i=0;i<length;i++) {
            node=nodes[i]

            if(typeof node==='string'||node.nodeType||node instanceof $.zepto.Z||(isVDom=node instanceof VirtualDom)) {
                node=this.append(isVDom?node.$el:node);
                node.marginTop=marginTop;
                node.marginRight=marginRight;
                node.marginBottom=marginBottom;
                node.marginLeft=marginLeft;
                node.height=height;
                node.width=width;

            } else {
                node=this.append(el,true);
            }

            this.scrollHeight+=node.height;

            node.hide=hideDom;
            node.show=showDom;
            if(node.marginTop==undefined) node.marginTop=0;
            if(node.marginBottom==undefined) node.marginBottom=0;
        }

        return node;
    }

    module.exports=VirtualDom;
});