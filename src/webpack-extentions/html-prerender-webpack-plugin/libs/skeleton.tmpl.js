
(function () {
    if (typeof Object.assign != 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, "assign", {
            value: function assign(target, varArgs) {
                // .length of function is 2

                if (target == null) {
                    // TypeError if undefined or null
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource != null) {
                        // Skip over if undefined or null
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    }

    function getObjectKeys(obj) {
        var result = [];
        for (var prop in obj) {
            result.push(prop);
        }
        return result;
    }
    // 固定命名，给React快照使用
    var _slicedToArray = function (arr, num) {
        return [].slice.call(arr, 0, num);
    };
    var ___components = [`___components`];
    var tags = "html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video,button,input,textarea".split(',');

    var createElement = function () {
        var args = _slicedToArray(arguments, arguments.length);
        var nodeName = args.shift();
        var props = args.shift() || {};
        var el;

        if (typeof nodeName === 'function') {
            props.children = args;
            return nodeName(props);
        } else {
            if (!nodeName || tags.indexOf(nodeName.toLowerCase()) === -1) {
                nodeName = 'div';
            }
            el = document.createElement(nodeName);
            el.className = props.className || '';
            if (props.style)
                el.style.cssText = getObjectKeys(props.style)
                    .map(function (name) {
                        return name.replace(/([A-Z])/g, '-$1') + ':' + props.style[name];
                    })
                    .join(';');
            switch (nodeName) {
                case 'input':
                    el.type = props.type || 'text';
                    el.placeholder = props.placeholder;
                    break;
                case 'img':
                    props.src && (el.src = props.src);
                    break;
            }
        }

        var appendChildren = function (children) {
            children.forEach(function (item) {
                if (item) {
                    if (item.nodeType) {
                        el.appendChild(item);
                    } else if (item instanceof Array) {
                        appendChildren(item);
                    } else {
                        el.appendChild(document.createTextNode(item));
                    }
                }
            });
        };
        appendChildren(args);

        return el;
    };

    var url = (location.hash || '/');
    var searchIndex = url.indexOf('?');
    var path = (searchIndex === -1 ? url : url.substr(0, searchIndex)).replace(/^#/, '');
    var search = searchIndex === -1 ? '' : url.substr(searchIndex);
    var query = {};

    search && search.replace(/(?:\\?|^|&)([^=&]+)=([^&]*)/g, function (r0, r1, r2) {
        query[r1] = decodeURIComponent(r2);
        return '';
    });

    var view = document.createElement('div');
    view.className = "view actived";
    view.setAttribute('route-path', path);
    view.setAttribute('ssr', 'ssr');

    `snapshots`.forEach(function (route) {
        if (route.match.test(path)) {
            view.appendChild(route.render({
                params: {},
                query: query,
                path: path
            }));
            // location.host.indexOf('5570')!=-1&&console.log(view.innerHTML);
        }
    });
    var root = document.getElementById('root');
    root.appendChild(view);

    return {
        url: url,
        path: path,
        query: query,
        createElement: createElement,
        view: view,
        root: root
    };
})();