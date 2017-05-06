Snowball
=======

强大的前端mvvm框架<br>
核心文件 https://github.com/sorrymeika/snowball/blob/master/src/core/model2.js


## Start With ViewModel

* `引入ViewModel`
```js
var vm = require('core/model2');
var ViewModel = vm.Model;
```

* `创建一个组件`
```js
var Component = ViewModel.extend({
    // 默认模版
    el: '模版',

    // 默认属性
    attributes: {
        title: '标题'
    }
});
```

* 可以用 `createModel` 或 `createCollection` 方法创建一个 Model/Collection

```js
var user = vm.createModel({
    attributes: {
        userName: '用户名'
    },

    someFunc: function(){

    }
})

// 创建一个Collection
var collection = vm.createCollection({
    array: [{
        name: 'collection item0'
    }],

    getUserById: function(userId){
        return this.find('userId', userId)
    }
})
```


* `也可以直接 new 一个 ViewModel实例`

```js

/**
 * 初始化一个ViewModel
 *
 * @params {String|Element|Zepto<Element>|jQuery<Element>} template 模板
 * @params {Object} attributes 属性
 */
var model = new ViewModel(template, {
    title: '标题',
    titleClass: 'title',
    date: Date.now(),

    friend: {
        friendName: '小白'
    },

    messages: [{ content: 'xxx' }],

    // 可以传入 `createModel` 创建的model
    user: user,

    // 可以传入 `createCollection` 创建的collection
    collection: collection
});
```

<br>

* 这是一个简单的 `template` 
* 使用 `{expression}` 和 `sn-属性` 来绑定数据

```html
<header class="header {titleClass}">这是标题{title}{title?'aaa':encodeURIComponent(title)}</header>
<div class="main">
    <ul>
        <li>时间:{util.formateDate(date,'yyyy-MM-dd')}</li>
        <li>user:{user.userName}</li>
        <li>friend:{friend.friendName}</li>
        <li sn-repeat="msg in messages">msg:{msg.content}</li>
        <li sn-repeat="item in collection">item:{item.name}</li>
    </ul>
</div>
```
```js
// 通过 `model.set` 方法来改变数据
model.set({
    date: Date.now()+10000,
    user: {
        userName: 'asdf'
    }
});

// 通过 `createModel` 创建的model的 `set` 方法改变数据
user.set({
    userName: '小红'
})

// 通过 `collection.set` 方法覆盖数据
collection.set([{
    id: 1,
    name: 'A'
}]);

// 通过 `collection.add` 方法添加数据
collection.add({ id: 2, name: 'B' })
collection.add([{ id: 3, name: 'C' }, { id: 4, name: 'D' }])


// 通过 `collection.update` 方法更新数据
collection.update([{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }], 'id');
collection.update([{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }], function(a, b) {

    return a.id === b.id;
});
```


# 监听 Model

* `observe / removeObserve / on('change:child.attribute',cb)` 
```js
// 监听所有数据变动
model.observe(function(e) {

});

// 监听 `user` 数据变动
model.observe('user', function(e) {

});

// 监听 `user.userName` 属性变动
model.change('user.userName', function(e) {

});
```


# sn-属性

* `sn-[events]` dom事件

```js

model.onButtonClick = function(userName) {
    alert(userName);
}

// 设置 `model` 的事件代理
model.delegate = {
    onButtonClick: function(user) {
        alert(user.userName);
    }
}
```

```html
<div>
    <button sn-tap="this.onButtonClick(user.userName)">Click 0</button>
    <button sn-tap="delegate.onButtonClick(user)">Click 1</button>
</div>
```


* `sn-repeat` 循环

```js
var model = new ViewModel(this.$el, {
    title: '标题',
    list: [{
        name: 1,
        children: [{
            name: '子'
        }]
    }, {
        name: 2
    }]
});
```

```html
<div class="item" sn-repeat="item,i in list|filter:like(item.name,'2')|orderBy:item.name">
    <p>这是标题{title}，加上{item.name}</p>
    <ul>
        <li sn-repeat="child in item.children">{i}/{child.name+child.age}</li>
    </ul>
</div>
```

* `[sn-if]` `[sn-else-if]` `[sn-else]` 条件控制

```html
<div class="item" sn-if="{!title}">当title不为空时插入该element</div>
<div class="item" sn-else-if="{title==3}">当title不为空时插入该element</div>
<div class="item" sn-else>当title不为空时插入该element</div>
```

* `sn-display` 控件是否显示（有淡入淡出效果，若不需要动画效果可使用`sn-visible`或`sn-if`）

```html
<div class="item" sn-display="{title}">当title不为空时显示</div>
```

* `sn-html` 设置innerHTML

```html
<div class="item" sn-html="{title}"></div>
```


* `sn-component` 引入其他组建

```js

var model = new ViewModel({

    components: {
        tab: require('widget/tab')
    },

    el: template,
    
    delegate: this,

    attributes:  {
        title: '标题',
        list: [{
            name: 1,
            children: [{
                name: '子'
            }]
        }, {
            name: 2
        }]
    }
});

```

```html

<div class="tab" sn-component="tab" sn-props="{{items:['生活服务','通信服务']}}"></div>
或
<sn-tab class="tab" props="{{items:['生活服务','通信服务']}}"></sn-tab>
```



---

# 使用框架的更多功能 (构建、Router、Application、Activity、Bridge...)
1. `npm install`
2. `cd m.cause`
3. `node app.js` 启动dev环境
4. 浏览器输入 http://127.0.0.1:5560 即可访问
5. `node app.js --build=test` 打包测试环境到dest文件夹
6. `node app.js --build=production` 打包生产环境到dest文件夹

# 目录结构

* webresource---------资源文件夹
    * images---------图片/css文件夹
    * js---------js文件夹
        * core---------框架核心
        * components---------组件文件夹
        * extend ---------扩展文件夹
        * graphics---------动态效果文件夹
        * widget ---------组件文件夹
        * util---------工具类
    * m---------m站专用文件夹
        * 同上
* m.cause    ---------项目文件夹
    * dest---------打包文件夹
    * components---------组件文件夹
    * images ---------项目图片/css
    * models ---------models文件夹
    * views ---------视图文件夹
    * template ---------模版文件夹
    * `app.js`---------项目启动/打包文件
    * `global.json`---------全局配置文件
    * `config.json`---------项目/路由配置文件

# 配置项

## global.json

* `dest` 打包文件夹
* `api` 服务端api地址
* `proxy` 代理设置(一般情况无需配置)
* `css` 公用css，主项目和子项目公用的css，多个css会在打包后合并
* `images` 图片文件夹，打包后会将该文件夹下的图片移动到dest文件夹
* `combine` js文件合并配置

```js
{
    //将./components/share.js,./components/api.js合并为components.js
    "components": {
        //./components/share.js打包后seajs的moduleid为components/share
        "components/share": "./components/share",
        "models/api": "./components/api"
    }
}
```
* `path` 查找js的位置，类似于环境变量
* `port` 开发服务器的访问端口
* `projects` 项目文件夹，主项目和子项目都放在该数组中
* `env` 环境配置，打包时--build参数使用该配置里的对应项，如`node app.js --build=test`会使用`env.test`的配置
* `framework` 框架打包配置

## config.json

* `global.json` -> `projects` 中配置的主项目和子项目文件夹中每个都要有config.json
* `css`当前项目独用的css，多个css会在打包后合并
* `js`当前项目独用的js，多个js会在打包后合并
* `images`当前项目独用的images
* `route`当前项目的路由配置

### 路由 config.json -> route
```javascript
"route": {
    //将#/映射到index,从项目view/template文件夹中搜索index.js/index.html
    "/": "index",
    //访问地址#/item/1，view/item.js中通过this.route.params.id获取参数值
    "/item/{id:\\d+}": "item"
}
```


# 页面

## Views

* views为项目的视图层，实现页面代码逻辑
* views下的js文件名称要同route中配置的一样
* 视图继承自Activity类,｀var Activity = require('core/activity')｀

### Activity 页面管理器

* Activity.extend(options)方法，返回Activity的子类
* options 参数:
    * `onCreate` 事件，初始化视图时调用
    * `onAppear` 事件，每次动画开始时调用
    * `onShow` 事件，每次进入动画结束时调用
    * `onLoad` 事件，第一次进入动画结束时调用
    * `onPause` 事件，每次隐藏视图时调用
    * `onHide` 事件，每次离开动画结束时触发
    * `onResume` 事件，每次重启时调用
    * `onDestroy` 事件，销毁视图时调用
    * `events` 对象，事件处理 `(Discarded)`

* `back(url)` 方法，返回某页面(返回动画)

```javascript
module.exports = Activity.extend({
   onCreate: function () {
        // 返回首页

        var model = new ViewModel(this.$el, {

        });

        model.delegate = this;
    },

    backToHome: function(){
        this.back('/');
    }
})
```

* `forward(url)` 方法，前进到某页面(前进动画)

```javascript
module.exports = Activity.extend({
   onCreate: function () {
        // 返回首页

        var model = new ViewModel(this.$el, {

        });

        model.delegate = this;
    },

    forwardToProduct: function(){
        this.forward('/product');
    }
})
```

* `replaceWith(url)` 方法，替换当前Activity


* `query` 对象，链接`?`号后面的内容

```javascript
module.exports = Activity.extend({
    onCreate:function() {
        // /item/2?id=1&name=xx

        console.log(this.query.id)
        console.log(this.query.name)
        // 1
        // xx
    }
})
```
* `el` 对象，当前element

* `$el` 对象，当前$(element)

* `model` 对象，数据视图双向绑定，需要在onCreate时初始化，具体可见`template`

```javascript
var Activity = require('core/activity');
var ViewModel = require('core/model2').ViewModel;

module.exports = Activity.extend({
    onCreate:function() {
        var data = {
            title: "标题",
            list: [{
                name: 1
            }, {
                name: 2
            }]
        };
        this.model = new ViewModel(this.$el, data);

        //更新数据
        this.model.set({ title: '新标题' })
    }
})
```



# 桥

* js调用原生功能

```js
var bridge = require('bridge');
bridge.getLocation(function(res) {

    console.log(res.longitude)
    console.log(res.latitude)
})
```

* `pickImage(callback)` 选择相册图片

* `takePhoto(callback)` 拍照

* `getDeviceToken(callback)` 获取消息通知devicetoken

* `getLocation(callback)` 获取当前位置,callback参数{longitude,latitude}

* `ali(data,callback)`支付宝支付api

* `wx(data,callback)`微信api（支付、分享）

* `qq(data,callback)`qq api（分享）

* `update(updateUrl, versionName, callback)` 更新app

<br>
<br>

## API文档

### `Model`、`Collection`

#### `vm.createModel`、`vm.createCollection` 方法

* 创建 `Model`、`Collection`

```js
var vm = require('core/model2');

// 创建一个 `model`
var user = vm.createModel({
    attributes: {
        userId: 1,
        userName: '用户名'
    },

    setId: function(id) {
        this.set({
            userId: id
        })
    }
})


// 创建一个collection
var collection = vm.createCollection({
    array: [{
        id: 1,
        name: 'collection item0'
    }],

    getById: function(id){
        return this.find('id', id)
    }
})


// 创建一个关联了其他 model/collection 的 model
var home = vm.createModel({
    attributes: {
        title: '首页',

        // 可以设置为其他 model
        user: user,

        // 可以设置为collection
        collection: collection
    }
})
```

#### `(Model|Collection).prototype.set` 方法

* 设置 `Model`、`Collection`

```js
// 通过 `set` 方法来改变数据
// 此时关联了 `user` 的 `home` 的数据也会改变 
user.set({
    userName: 'asdf'
});

home.set({
    title: 1,
    user: {
        age: 10
    }
});

// 通过 `collection.set` 方法覆盖数据
collection.set([{
    id: 1,
    name: 'A'
}]);

```

#### `Model.prototype.observe` 方法

* 监听 Model变化

```js
// 监听所有数据变动
model.observe(function(e) {

});

// 监听 `user` 数据变动，不监听属性的变动
model.observe('user', function(e) {

});

// 监听 `user.userName` 属性变动
model.change('user.userName', function(e) {

});
```

#### `Model.prototype.removeObserve` 方法

* 移除监听


#### `Model.prototype.collection(key)` 方法

* 获取属性名为key的collection，不存在即创建

```js
model.collection('productList').add([{ id: 1 }]);
```

#### `Model.prototype.model(key)` 方法

* 获取属性名为key的model，不存在即创建
```js
home.model('settings').toJSON();
```

#### `(Collection|Model).prototype._` 方法

* Model/Collection 查询

```js

/**
  * 搜索子Model/Collection，
  * 支持多种搜索条件
  * 
  * 搜索子Model:
  * model._('user') 或 model._('user.address')
  * 
  * 根据查询条件查找子Collection下的Model:
  * model._('collection[id=222][0].options[text~="aa"&value="1"][0]')
  * model._('collection[id=222][0].options[text~="aa"&value="1",attr^='somevalue'|attr=1][0]')
  * 
  * 且条件:
  * model._("collection[attr='somevalue'&att2=2][1].aaa[333]")
  * 
  * 或条件:
  * model._("collection[attr^='somevalue'|attr=1]")
  * 
  * 不存在时添加，不可用模糊搜索:
  * model._("collection[attr='somevalue',attr2=1][+]")
  * 
  * @param {string} search 搜索条件
  * @param {any} [def] collection[attr='val'][+]时的默认值
  */
home._('collection[name~="aa"|id=1,type!=2]').toJSON();


/**
 * 查询Collection的子Model/Collection
 * 
 * 第n个:
 * collection._(1)
 * 
 * 查询所有符合的:
 * collection._("[attr='val']")
 * 数据类型也相同:[attr=='val']
 * 以val开头:[attr^='val']
 * 以val结尾:[attr$='val']
 * 包含val，区分大小写:[attr*='val']
 * 包含val，不区分大小写:[attr~='val']
 * 或:[attr='val'|attr=1,attr='val'|attr=1]
 * 且:[attr='val'&attr=1,attr='val'|attr=1]
 * 
 * 查询并返回第n个:
 * collection._("[attr='val'][n]")
 * 
 * 一个都不存在则添加:
 * collection._("[attr='val'][+]")
 * 
 * 结果小于n个时则添加:
 * collection._("[attr='val'][+n]")
 * 
 * 删除全部搜索到的，并返回被删除的:
 * collection._("[attr='val'][-]")
 * 
 * 删除搜索结果中第n个，并返回被删除的:
 * collection._("[attr='val'][-n]")
 * 
 * @param {string} search 查询条件
 * @param {object} [def] 数据不存在时默认添加的数据
 * 
 * @return {array|Model|Collection}
 */
collection._('[name="aa"]').toJSON();
```

#### `Collection.prototype.add` 方法

```js
// 通过 `collection.add` 方法添加数据
collection.add({ id: 2, name: 'B' })
collection.add([{ id: 3, name: 'C' }, { id: 4, name: 'D' }])
```

#### `Collection.prototype.update` 方法

```js
// 通过 `collection.update` 方法更新数据
collection.update([{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }], 'id');
collection.update([{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }], function(a, b) {

    return a.id === b.id;
});
```

#### `Collection.prototype.updateTo` 方法

* 与update的差异：已有项将被增量覆盖，不在arr中的项将被删除

```js
var arr = [{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }];

// 通过 `collection.updateTo` 方法更新数据
collection.updateTo(arr, 'id');
```


#### `Collection.prototype.updateMatched` 方法

* 与update的差异：只更新collection中已有的，不在collection中的不处理

```js
var arr = [{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }];

// 通过 `collection.updateTo` 方法更新数据
collection.updateTo(arr, 'id');
```

#### `Collection.prototype.unshift` 方法

* 首部插入数据

```js
collection.unshift({ id: 1 });
```

#### `Collection.prototype.splice` 方法

* 移除或插入数据

```js
collection.splice(0,1,{ id: 1 });
```

#### `Collection.prototype.size` 方法 | `Collection.prototype.length` 属性

* Collection 长度


#### `Collection.prototype.map` 方法

* 同 `Array.prototype.map`

#### `Collection.prototype.find` 方法

* 查找某条子Model

```js
collection.find('id', 1);
```

#### `Collection.prototype.filter` 方法

* 同 `Array.prototype.filter`


#### `Collection.prototype.remove` 方法

* 从 collection 中移除

```js
collection.remove('id', 1);

collection.remove(model);

collection.remove(function(item) {
    return true|false;
});
```


#### `Collection.prototype.clear` 方法

* 清除 collection


#### `Collection.prototype.each` 方法

* 遍历 collection


#### `Collection.prototype.toArray` | `Collection.prototype.toJSON` 方法

* 将 collection 转为数组

#### `(Model|Collection).prototype.destroy`

* 销毁 Model | Collection


<br>

-------

<br>

###  `util`

* 工具类

#### `util.pick` 方法

* 同 _.pick


#### `util.encodeHTML` 方法

* html 转码

#### `util.store` 方法

* 获取、设置localStorage

#### `util.equals` 方法

* 判断两个 Object、Array 结构是否相同（引用不同）

#### `util.groupBy` 方法

* 数组分组

#### `util.sum` 方法

* 数组求和


#### `util.array` 方法

* 数组操作链

```js
// 链式处理，并返回数组中某个item
util.array([{ id: 1 }, { id: 2 }])
    .filter('id', 1)
    .concat([{ id: 3 }])
    .map((item) => item)
    .exclude('id', 2)
    .find('id', 3);

// 链式处理，并返回 Array
util.array([{ id: 1 }, { id: 2 }])
    ._('[id=1,name=2]')
    .filter((item) => item.id == 1)
    .toArray();
```

#### `util.query` 方法

* 数组搜索，类似 `Collection.prototype._`


#### `util.formatDate` 方法

* 日期转字符串


```js

util.formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss_ffff');

// 2012-02-03 星期一
util.formatDate(new Date(), 'yyyy-MM-dd W');

// 刚刚、n分钟前、n小时前、昨天 HH:mm、yyyy-MM-dd HH:mm
util.formatDate(Date.now(), 'short');

// HH:mm、昨天 HH:mm、yyyy-MM-dd HH:mm
util.formatDate(Date.now(), 'minutes');

```
