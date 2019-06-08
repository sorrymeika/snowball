# Snowball

* `snowball` 是一个全套的`web app/hybrid app`开发框架，包括：路由、状态管理和视图。
* snowball-app: 路由系统，拥有多工程跨工程加载、可配置前进后退动画效果、动态管理DOM、手势返回等功能。 
* snowball-model：状态管理框架，immutable。
* snowball-view：view层框架，fiber模式渲染，高性能，双向绑定。 采用运行时模版编译。同时提供`React`支持。

# 优点
1. 一个核心框架库＋多个业务库。业务库之间不依赖，可单独发布
2. 发布后到业务库共用一份核心库的js/css/image/iconfont，减少下载资源的大小
3. 多个业务库组成的单页应用。保证用户体验的统一和代码风格的统一

# 实现方式

## 路由
```
该路由方案将多个库整合成一个单页应用，使所有业务都使用相同的跳转动画、手势返回、页面缓存
```
1. 核心框架 `snowball` 统一控制路由，需要在 `snowball` 中注册需要加载的业务
2. 业务库打包后会生成`asset-manifest.json`文件，`snowball` 通过路由匹配到业务，并加载manifest中的js和css。
3. 业务js加载时调用`registerRoutes({...})` 方法注册子路由
4. `snowball` 在业务js／css加载完成后，根据业务注册的子路由跳至对应页面。

## 开发


### Getting Start

* run `npm install`
* run `npm start` to start development server, it'll open the project url in browser automatically!
* run `npm run test` to run test cases!
* run `npm run build` to build the production bundle.
* run `npm run sprity` to build sprity images.
* to see the built project, please visit `http://localhost:3000/dist/#/`

**if you get some error about `canvas`**

* run `brew install pkgconfig` if show "**pkg-config: command not found**"
* run `brew install cairo` if show "**No package 'cairo' found**"
* if you don't have **brew** command in your computer, see the [brew installation](https://brew.sh/)
* install the [XQuartz](https://www.xquartz.org/)

**or**

* see the [Installation OSX](https://github.com/Automattic/node-canvas/wiki/Installation---OSX) to install without **brew** command

### Use Snowball

1. 将`snowball`放到当前项目的父文件夹下(与当前项目同级)
2. 运行命令
```sh
ln -s ../../snowball ./node_modules
```
3. `import { env, Model } from "snowball"`

## 打包
```
业务项目打包后会剔除掉`react`,`react-dom`,`polyfill`等框架和框架中的公共组件/公共样式
```
1. `snowball`会将`React`等框架注册到 `window.Snowball` 上
2. 使用 `snowball-loader`, 该loader会将 `import React from "react"` 替换成 `const React = window.Snowball.React`


## 框架版本管理

1. `snowball` 会分大版本（1.x和2.x）和小版本（1.x.x和1.x.x），小版本升级(自动化测试)业务不感知。大版本升级业务需处理。
2. `snowball` 会尽量保证兼容性。让大版本升级尽量平滑。

## 项目结构

* 项目主要分为`Controller`、`Service`、`View`层
* `Controller`层用来组织`Service`层，并通过`injectable`注解将数据注入到`View`层

## 项目代码示例

* 看完上面的文档再看例子

```js
import { Model, Collection, Reaction, attributes } from 'snowball';
import { controller, injectable, service, observer } from 'snowball/app';

// Model 的接口必须定义
interface IUser {
    userId: number;
    userName: string;
}

// Model
class UserModel extends Model {
    static defaultAttributes = {
    }
    attributes: IUser
};

const user = new UserModel({
    userName: 'aaa'
});

console.log(user.get(''));

// 可用 Reactive Object 替换 Model
class User implements IUser {
    @attributes.number
    userId;

    @attributes.string
    userName;

    constructor(user: IUser) {
        User.init(this, user);
    }
}

// Reaction 需和 Reactive Object 配合使用
// observer 基于 Reaction 实现
const user = new User();
const reaction = new Reaction(() => {
    console.log('it works!');
});
reaction.track(() => {
    console.log(user.userId);
});

setTimeout(() => {
    user.userId = Date.now();
    reaction.destroy();
}, 1000);

// Service 的接口必须定义
interface IUserService {
    user: IUser;
    setUserName(): void;
    loadUser(): Promise<IUser>;
}

// Service
@service
class UserService implements IUserService {
    constructor() {
        this._user = new User();
    }

    get user() {
        return this._user
    }

    loadUser() {
    }

    setUserName(userName) {
        this.user.userName = userName;
    }
}

// observer 组件
@observer(['userService', 'buttonStatus'])
class App extends Component<{ userService: IUserService }, never> {
    @attributes.string
    ohNo = 'oh, no!!';

    ohYes = () => {
        this.ohNo = 'oh, yeah!!';
    }

    render() {
        const { userService } = this.props;
        return (
            <div
                onClick={userService.setUserName.bind(null)}
            >
                {userService.user.userName}
                <p onClick={this.ohYes}>{this.ohNo}</p>
            </div>
        )
    }
}

// Controller
@controller(App)
class AppController {
    @injectable userService: IUserService;
    @injectable buttonStatus;

    constructor({ location }) {
        this.userService = new UserService();
        this.buttonStatus = observable(1);
    }

    pgOnInit() {
        this.userService.loadUser();
    }

    @injectable
    buttonClick() {
        this.buttonStatus.set(0);
    }
}
```

## api文档

### vm

* vm是一个MVVM框架，主要由 `Observer`、`ViewModel`、`Model`、`Collection`组成
* 在React项目中，我们一般使用他来替换`redux`

### 模版引擎

* 这是一个简单的 `template` 
* 使用 `{expression}` 和 `sn-属性` 来绑定数据

```html
<header class="header {titleClass}">这是标题{title}{title?'aaa':encodeURIComponent(title)}</header>
<div class="main">
    <h1>{title}</h1>
    <ul>
        <li>时间:{util.formateDate(date,'yyyy-MM-dd')}</li>
        <li>user:{user.userName}</li>
        <li>friend:{friend.friendName}</li>
        <li sn-repeat="msg in messages">msg:{msg.content}</li>
        <li sn-repeat="item in collection">item:{item.name}</li>
    </ul>
    <sn-template id="item"><li>{name}</li></sn-template>
    <ul>
        <li sn-repeat="item in list">{item.name}</li>
        <sn-item props="{{ name: item.name }}" sn-repeat="item in list"></sn-item>
    </ul>
</div>
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
<div class="item" sn-repeat="item,i in list|filter:like(item.name,'2')|orderBy:name asc,id desc,{orderByWhat} {ascOrDesc}">
    <p>这是标题{title}，加上{item.name}</p>
    <ul>
        <li sn-repeat="child in item.children|orderBy:this.orderByFunction">{i}/{child.name+child.age}</li>
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

#### `vm.Observer` 类

* 可观察对象，类的数据变化可被监听
* `ViewModel`, `Model`, `Collection`, `List`, `Dictionary`, `DictionaryList`, `Emitter`, `State` 都是 `Observer` 的子类，分别有不同的作用

```js
import { Observer, ViewModel, Model, Collection, List, Emitter, State } from 'snowball';

var viewModel = new ViewModel({
    el: `<div>
        <sn-template id="item"><li>{name}</li></sn-template>
        <h1>{title}</h1>
        <ul>
            <li sn-repeat="item in list">{item.name}</li>
            <sn-item props="{{ name: item.name }}" sn-repeat="item in list"></sn-item>
        </ul>
    </div>`,
    attributes: {
        title: '标题',
        list: [{
            name: '列表'
        }]
    }
});

var model = new Model({
    id: 1,
    name: '名称'
});

var collection = new Collection([{
    id: 2,
    name: '名称2'
}]);

collection.add(model);
collection.add([{ id: 3, name: '名称3' }]);

viewModel.set({
    data: model,
    list: collection
})
```
#### `vm.Model|vm.Dictionary` 类

* `Observer` 的属性变化不能被监听，`Model|Dictionary` 的属性变化可被监听
* `Model` 是深拷贝，且是 `immutable` 的，`Dictionary` 浅拷贝对象，`Observer` 不拷贝对象可接收值类型

#### `vm.List|vm.Collection|vm.DictionaryList` 类

* `List` 的子项是 `Observer`，`Collection` 的子项是 `Model`，`DictionaryList` 的子项是 `Dictionary`
* `List` 性能优于 `Dictionary` 优于 `Collection`

```js
var collection = new Collection([{
    id: 2,
    name: '名称2'
}]);

collection.add(model);
collection.add([{ id: 3, name: '名称3' }]);

// 原数据中ID存在相同的则更新，否则添加
collection.update([{ id: 2, name: '新名称2' },{ id: 3, name: '新名称3' }], 'id');

// 根据ID更新
collection.updateBy('id', { id: 3, name: '新名称' });

// 更换数组
collection.updateTo([{ id: 3, name: '新名称' }], 'id');

```

#### `(Observer|...).prototype.get` 方法
#### `Model.prototype.attributes|Collection.prototype.array` 属性(只读)

```js
var data = new Model({
    id: 1,
    name: 'immutable data'
})
// 同等于 data.get()
var oldAttributes = data.attributes;

// 数据无变化
data.set({
    id: 1
});
console.log(oldAttributes == data.attributes);
// true

data.set({
    name: '数据变化了'
});
console.log(oldAttributes == data.attributes);
// false

console.log(data.get('id'))
// 1
```

#### `(Observer|...).prototype.set` 方法

* 设置 `Model`、`Collection`

```js
// 通过 `set` 方法来改变数据
// 此时关联了 `user` 的 `home` 的数据也会改变 
// 若原先的 `userName` 已是'asdf'，则不会触发view更新
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
// 更新数据使用 `collection.update|updateBy` 等方法性能会更好
collection.set([{
    id: 1,
    name: 'A'
}]);

```

#### `(Observer|...).prototype.observe` 方法

* 监听 Model变化

```js
// 监听所有数据变动
model.observe(function(e) {

});

// Model|Dictionary 可监听 `user` 属性的数据变动
model.observe('user', function(e) {

});

// Model 监听 `user.userName` 属性变动
model.observe('user.userName', function(e) {
});
```

#### `(Observer|...).prototype.unobserve` 方法

* 移除监听

#### `(Observer|...).prototype.compute` 方法

* 计算

```js
// 计算
var computed = model.compute(({ user, id, homePageId }) => {
    return user + id + homePageId;
});
computed.observe((value) => {
});
computed.get();
```

#### `Model.prototype.collection(key)` 方法

* 获取属性名为key的collection，不存在即创建

```js
model.collection('productList').add([{ id: 1 }]);
```

#### `Model.prototype.model(key)` 方法

* 获取属性名为key的model，不存在即创建

```js
home.model('settings').attributes;
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

* 更新成传入的数组

```js
var arr = [{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }];

// 通过 `collection.updateTo` 方法更新数据
collection.updateTo(arr, 'id');
```


#### `Collection.prototype.updateBy` 方法

* 根据 comparator 更新 collection

```js
var data = [{ id: 3, name: 'C1' }, { id: 4, name: 'D1' }];

/**
 * 根据 comparator 更新Model
 * collection.updateBy('id', { id: 123 name: '更新掉name' })
 * collection.updateBy('id', [{ id: 123 name: '更新掉name' }])
 *
 * @param {String} comparator 属性名/比较方法
 * @param {Object} data
 * @param {boolean} renewItem 是否覆盖匹配项
 *
 * @return {Collection} self
 */
collection.updateBy(id, data, true|false);
```

#### `Collection.prototype.unshift` 方法

* 首部插入数据

```js
collection.unshift({ id: 1 });
```

#### `Collection.prototype.splice` 方法

* 移除或插入数据

```js
collection.splice(0,1,[{ id: 1 }]);
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

#### `(Observer|Model|Collection).prototype.destroy`

* 销毁 Model | Collection


### `observable`

* 可观察对象

#### `observable()`

```js
// 自动根据数据类型生成 observable object
// plainObject对应Model, array对应Collection, 其他对应Observer
const observer = observable(0|{}|[]|'');

// 设置数据
observer.set(1);

// 数据无变化不会触发事件
observer.observe((val) => {
    console.log(val);
});

// 移除监听
observer.unobserve((val) => {
    console.log(val);
});

// 传入function生成 observable object，它是只读的，不能set
const observer = observable((fn)=>{
  document.body.addEventListener('click', fn);
    return () => {
      document.body.removeEventListener('click', fn);
    }
});
```

### `vm.State` 类

```js
const state = new State();

// 异步设置触发事件，并且会触发3次
state.set(1);
state.set(2);
state.set(3);

console.log(state.get());
// undefined
```

### `vm.Emitter` 类

```js
const emitter = new Emitter();

// 同步触发事件，并且会触发3次
emitter.set(1);
emitter.set(2);
emitter.set(3);

console.log(emitter.get());
// 3
```

### `vm.attributes`

```js
class User {
    @attributes.number
    userId = 0;

    @attributes.string
    userName;

    @attributes.object
    auth;

    constructor(data) {
        User.init(this, data);
    }
}

const user = new User();
user.userId = 1;
user.userName = '张三';

// 监听user
User.observe(user, ()=>{
});
// 监听user.userId
User.observe(user, 'userId', ()=>{
});
// 计算user.userId
User.compute(user, 'userId', (userId)=>{
    return 'userId:' + userId;
});
// user to plainObject
User.get(user);

User.set(user, {
    userId: 1
});

User.set(user, (userModel) => {
    userModel.set({
        userId: 10
    })
});

for (var key in user) {
    console.log(key);
}
// userId
// userName
```

### 页面级事件

#### `withNotifyEvent` 高阶组件
* 给组件注入 `notifyEvent` 方法

#### `onMessage` 修饰符
* 为`controller` 或 `handler` 的方法增加事件监听

<br>

-------

<br>

### 服务层 `services`

* 领域服务层，可依赖`apis`,`models`,`methods`，主要作用为调用服务端接口，处理数据相关的业务逻辑，必须写interface。不要放到本层的业务：UI状态、页面跳转、打点、native交互等
* 应用服务层，主要作用为调用领域层，存储UI状态，处理UI逻辑。应用services间可互相调用。必须写interface.

```js
import * as unicorn from "../../../apis/unicorn";
import UserModel from "../models/UserModel";

let instance;

export default class UserService implements IUserService {

    // 仅限多个页面需要的共享数据的时候使用单例模式
    static getInstance(): IUserService {
        if (instance) {
            instance = new UserService();
        }
        return instance;
    }

    constructor() {
        this._userModel = new UserModel();
    }

    userModel() {
        return this._userModel;
    }

    // 从服务端请求数据，命名规范为 request[Something](args)
    async request() {
        return await unicorn.getUserInfo();
    }

    // 从服务端请求数据并保存到本地model，命名规范为 fetch[Something](args)
    async fetch() {
        var res = await this.request();
        this.userModel.set(res.data);
        return res;
    }

    // 更新本地/远程数据，命名规范为 update[Something](args)
    update() {
        this.userModel.set({
            title: 'afsdfas'
        })
    }
}
```

### 控制层 `controllers`

* 控制层，可依赖`domain`,`components`,`models`,`services`，主要用来处理UI状态、整合service并expose给UI等，本层一般只做整合，是页面/组件和应用层service的中介。若UI逻辑不可复用，则可省略应用服务层。

#### `@controller` 方法

* 关联页面/组件跟Controller类的方法，一般使用修饰符模式

#### `@injectable` 方法

* 将Controller类的属性或方法传递给 `@controller` 关联的页面 (注入到props里)

#### 例

```js
import { controller } from "snowball";
import Home from "../containers/Home";

/**
 * Controller类生命周期
 *     pgOnInit: 页面第一次打开，且动画开始前触发
 *     pgOnShow: 页面显示，动画结束时触发
 *     pgOnCreate: 页面第一次打开，且动画结束后触发
 *     pgOnResume: 页面从后台进入前台，且动画结束时触发
 *     pgOnPause: 页面从前台进入后台，且动画结束时触发
 *     pgOnDestroy: 页面被销毁后触发
 * Controller方法、属性排序
 *     constructor
 *     页面生命周期
 *     属性 (get, set)
 *     expose给Container的事件
 *     方法
 */
@controller(Home)
export default class HomeController {

    constructor(props, page) {
        // 框架会自动带入路由参数到 props 中
        // props.location.params 为路由 `/product/:type/:id ` 中的配置
        // props.location.query 为hash链接`?`后面的参数
        const id = props.location.params.id;
        const type = props.location.params.type;

        // /home?source=wap&id=1
        // 此时 props.location.query 为 { source: 'wap',id: 1 }
        console.log(props.location.query);

        // 页面信息
        // 页面是否是激活状态
        // console.log(page.isActive());
        // 页面是否是销毁
        // console.log(page.isDestroy());
        this.page = page;

        this.userService = new UserService();
    }

    // 页面初始化事件，数据请求不要放到 `constructor` 里，而是放在 `pgOnInit` 里
    async pgOnInit(page) {
        await this.userService.fetch();

        // 缓存页面数据到localStorage
        this.page.setCache({
            user: this.user
        });
    }

    pgOnPause(page) {
    }

    pgOnResume(page) {
    }

    pgOnDestroy(page) {
    }

    // `user` 把注入给 `Home` 组件
    @injectable
    get user() {
        return this.service.getModel();
    }

    // 把 `onTitleClick` 注入到 `Home` 组件
    // 使用 `@injectable` 后不要使用箭头函数
    @injectable
    onTitleClick() {
        this.service.update();
    }
}
```

#### `controller` 层业务逻辑拆分

* 业务逻辑过多时需要将业务逻辑拆分，并使用 `mix` 方法合并需要的 `mixin`

```js
// types.js
export interface IControllerBase {
    // TODO: your properties
}

export interface IHomeController extends IControllerBase {
    // TODO: your properties
}

// ControllerBase.js
import { IControllerBase } from "../constants/types";

export default class ControllerBase implements IControllerBase {
    constructor(service, page) {
        this.service = service;
    }

    // 页面初始化事件，数据请求不要放到 `constructor` 里，而是放在 `pgOnInit` 里
    pgOnInit(page) {
        this.service.fetch();
    }
}

// globalAddressMixin.js
import { controller } from "snowball";
import { IControllerBase } from "../constants/types";

export default function globalAddressMixin(ControllerBase: IControllerBase) {
    return class extends ControllerBase {
        constructor(service, page) {
            super(service, page);

            this.globalAddressService = GlobalAddressService.getInstance();
        }

        pgOnInit() {
            super.pgOnInit();

            this.globalAddressService.fetch();
        }
    }
}

// HomeController.js
import { controller, mix } from "snowball";
import Home from "../containers/Home";
import { IHomeController } from "../constants/types";
import globalAddressMixin from "./globalAddressMixin";

export default class HomeController extends mix(ControllerBase)
        .with(globalAddressMixin) implements IHomeController  {
    constructor(props, page) {
        const homeService = new HomeService();
        super(homeService, page);

        this.type = location.params.type;
    }
}
```

<br>

-------

<br>

### 页面层（containers）

* 存放页面级组件，只负责展示和整合components，一般使用无状态组件，事件和业务逻辑操作统一交给`controllers`来处理。可依赖`components`

```js
var User = function (props) {
    // 被映射的数据
    console.log(props.user);

    return <div onClick={controller.onClick}>{props.user.name}</div>;
}
```


### `withProps` 方法

* 扩展组件的`props`

```js
const enhance = withProps((props, useEffect)=>{
    const count = observable(1);

    useEffect((props) => {
        const domClick = ()=>alert(1);
        document.addEventListener('click',domClick);
        return () => {
            document.removeEventListener('click',domClick);
        }
    });

    useEffect((props) => {
        document.title = props.name;
    }, (props)=>[props.name]);

    useEffect((props) => {
        document.getElementById('root').innerHTML = props.id;
    }, ['id']);

    return {
        count,
        onChange() {
            count.set(count+1);
        }
    }
});

@enhance
class Component {
    render() {
        const { count, onChange } = this.props;
        return <div onClick={onChange}>{count}</div>;
    }
}

export default Component;
```

### `provide` 方法

* 创建数据提供者

```js
class Component {
}

// 尽量把逻辑放在 `controller` 里，除非逻辑非常独立
provide((props)=>{
    return {
        child:'xxx'
    }
})(Component)
```

### `inject` 方法

* 可将`controller`里`injectable`的和`provide`方法返回的属性和方法，通过inject方法跨组件注入到子组件的props中

```js
import { inject } from 'snowball';

// 尽量使用修饰符和字符串参数，保证传 `props` 时能够覆盖 `context`
@inject('home', 'child')
class SomeComponent extends Component {
}

// `nextProps` 的优先级更高
inject(({ global, data }, nextProps)=>{
    return {
        user: global.user,
        data
    }
})(Component)
```

<br>

-------

<br>

### 应用和路由

#### `startApplication` 方法

* 启动应用

```js
import { startApplication } from 'snowball';
import HomeController from 'controller/HomeController';

// 子应用根路由注册
var projects = {
    [env.PROJECTS.TRADE]: ['trade', 'spu', 'item', 'order', 'cart', 'address']
};
// 主应用路由注册，不可和子应用根路由重合
// 尽量把路由收敛到 `routers.js` 中
var routes = {
    '/': HomeController,
    '/product': require('bundle?lazy&name=product!controllers/ProductController')
};
// 启动应用
var app = startApplication({
    projects,
    routes,
    // 应用级数据提供，可使用inject('global')方法注入到子组件props.global中
    stores: {
        user
    },
    options: {}
}, document.getElementById('root'), callback);
```


#### `registerRoutes` 方法

* 注册路由

```js
import { registerRoutes } from 'snowball';

/**
 * 路由列表格式为: 
 * {
 *   [key]: require('module')
 * }
 * 其中key为路由规则，可完全匹配、模糊匹配和正则匹配，示例：
 */
var routes = {
    // 完全匹配
    '/cart': require('bundle?lazy&name=cart!controllers/CartController')
    // 完全匹配
    "/medical": require('someComponent')
    // 模糊匹配
    "/market/:id": require('someComponent')
    // 正则匹配
    "/o2omarket/\\d+:id": require('someComponent'),
    // 正则匹配多路由
    "/proxy/home(?:/\\d+:logicId)?": require('someComponent')
    // 懒加载
    "/shop": require('bundle?lazy&name=ur-package-name!someComponent')
};
// 注册新路由
registerRoutes(routes);
```

<br>

-------

<br>

### 页面跳转

#### `transitionTo` 方法

* 通用跳转

```js
import { transitionTo } from 'snowball';

// 跳转到商品页，依赖mall-core的应用跳转默认带前进函数
transitionTo('/item/1');
transitionTo('https://www.whatever.com/yao-h5/#/product/2');
```

#### `app-link` 属性

```js
<div app-link="/item/1"></div>
<div app-link="@achror">锚点</div>
<div app-anchor-name="achror">锚到这里</div>
```

#### `navigation.forward` 方法

* 跳转页面，带前进动画

```js
import { navigation } from 'snowball';

// 跳转到商品页
navigation.forward('/item/1')

// 跳转并传入 props
navigation.forward('/item/2', {
    action: 'dofast'
})
```

#### `navigation.back` 方法

* 跳转页面，带返回动画

```js
import { navigation } from 'snowball';

// 返回到首页
navigation.back('/')

// 返回到首页并传入 props
navigation.back('/', {
    action: 'dofast'
})
```

#### `navigation.transitionTo` 方法

* 跳转页面

```js
/**
 * @param {string} [url] 跳转连接
 * @param {boolean} [isForward] 是否带前进动画，前进动画:true，后退动画:false，不填无动画
 * @param {object} [props] 传给下个页面的props 
 */

// 不带动画跳转返回到首页并动画跳转到商品页，这样使用history records才不会错乱
navigation.transitionTo('/')
    .forward('/product/5');

// 不带动画跳转
navigation.transitionTo('/product/4');
```

#### `navigation.replace` 方法

* 替换当前链接，覆盖最后一条历史

```js
navigation.replace('/error/notfound?error=店铺状态异常');
```


#### `navigation.home` 方法

* 返回到native首页(关闭webview)

```js
navigation.home()
```

<br>

-------

<br>

### 公共组件

#### MainScrollView|ScrollView

* 带滚动条和自动加载数据功能的组件

```js
import { ScrollView, MainScrollView } from 'snowball/components';

/**
 * @param {function} [onScrollViewInit] 初始化事件
 * @param {function} [pullToRefresh] 下拉刷新
 * @param {function} [onReachBottom] 滚动到底部事件
 * @param {string|PagiationStatus} [loadMoreStatus] 加载更多状态
*/
<MainScrollView
    loadMoreStatus={PagiationStatus}
    onReachBottom={autoLoadMore}
    pullToRefresh={()=>{  }}
>
</MainScrollView>

<ScrollView onScroll={()=>{}} className="mk_shop__list">
<div>content</div>
</ScrollView>
```


#### MainScrollViewWithHandler|scrollUtils

* `controller`中提供`mainScrollViewHandler`后，该组件初始化时会自动掉用`mainScrollViewHandler.svOnInit `

```js
import { createPage, inject } from 'snowball';
import { MainScrollViewWithHandler, scrollUtils } from 'snowball/components';

@inject('mainScrollViewHandler')
class BottomBar extends Component {
    constuctor(props) {
        super(props);
        props.mainScrollViewHandler.addOnScrollListener((e)=>{
            console.log(e, e.target, e.x, e.y);
        });
    }

    render() {
        return <div></div>
    }
}

const UserPage = ()=> {
    return (
        <MainScrollViewWithHandler>
            <BottomBar></BottomBar>
        </MainScrollViewWithHandler>
    );
}

const UserPageProvider =  provide(()=>({ 
    mainScrollViewHandler: scrollUtils.createScrollHandler() 
}))(UserPage);

ReactDOM.render(<UserPageProvider></UserPageProvider>)

```


#### Header

* app头组件

```js
import { Header } from 'snowball/components';

// 普通app头
<Header 
    title="Title"
/>

// 带搜索和按钮的app头
<Header
    className="hp_homepage__header header_primary"
    buttons={
        <button
            app-link="/order"
            className="iconfont icon-list cl_fff pl_s pr_s dp_b ta_c lh_1"
        >
            <i className="dp_b fs_xxs mt_2">我的订单</i>
        </button>
    }
>
    <form
        app-link="/medicalsearch"
        className="header_search iconfont icon-search flex"
        style={{ marginLeft: '-8%', width: '85%' }}
        onSubmit={() => false}
    >
        <span className="ps_r fs_m cl_999">{searchDocument ? searchDocument : '搜索'}</span>
    </form>
</Header>
```

#### 小文字/小文字Tag标签（修复安卓小与12px的文字偏上）

* 小文字/小文字Tag标签（修复安卓小与12px的文字偏上）

```js
import { SmallTag, SmallText } from 'snowball/components';

<SmallTag className={'ur_tag'} text="aaa" fontSize="8" />
<SmallText text="aaa" fontSize="8" />
```


#### 图片轮播

* 图片轮播组件
```js
import { Slider } from 'snowball/components';

<Slider 
    data={
        [{
            link: '/',
            src: 'image src'
        }]
    }
/>
```

#### 图片浏览组件

* 图片浏览组件

```js
import { PhotoViewer } from 'snowball/components';

<PhotoViewer 
    images={
        [{
            src: 'image src'
        }]
    }
/>
```


### 通用弹框组件

```js
import { toast, loader, popup } from 'snowball/widget';

// Toast
toast.showToast('2秒后消失');

// 显示／隐藏加载中
loader.showLoader();
loader.hideLoader();

// 弹框，具体参数见代码注释
popup.confirm({ title, content, onOk, onCancel });
popup.alert({ title, content, onOk });
popup.prompt();
// 通用弹框
popup.popup();
```

<br>

-------

<br>

###  自定义事件

```js
import { Event, EventEmitter } from 'snowball';

const emitter = new EventEmitter();

emitter.on('dataload', (e)=>{});
emitter.one('dataload', (e)=>{});
emitter.off('dataload');

emitter.trigger('dataload');
emitter.trigger(new Event('dataload', {
    target
}));

```

<br>

-------

<br>

###  `gateway` 接口请求

```js
import { gateway } from 'snowball';

var result = await gateway.request(_mt, needLogin?, postData?);
// result = { success: true|false, data: Object, stat, code, message }
```

<br>

-------

<br>

###  `jsonp` 接口请求

```js
import { jsonp } from 'snowball';

await jsonp('src', params);
```

<br>

-------

<br>

###  `loadJs` 加载js

```js
import { loadJs } from 'snowball';

await loadJs('src');
await loadJs(['src', 'src1']);
```

<br>

-------

<br>

###  `util`

* 工具类

```js
import { util } from 'snowball';
```
#### `util.is(PlainObject|EmptyObject|Boolean|Number|String|Object|Array|Yes|No|Thenable)`

#### `util.qs`
#### `util.hashQs`

```js
import { util } from 'snowball';
const url = 'https://www.whatever.com/?app=snowball#/item/123?source=home';
const queryStringObject = util.qs(url);
// { app: 'snowball' }

const newUrl = util.qs(url, { biz: 'DJ' });
// 'https://www.whatever.com/?app=snowball&biz=DJ#/item/123?source=home'

const hashObject = util.hashQs(url);
// { source: 'home' }

const newUrlWithHash = util.hashQs(url, { biz: 'DJ' });
// 'https://www.whatever.com/?app=snowball#/item/123?source=home&biz=DJ'
```

#### `util.clone`

#### `util.deepClone`

#### `util.extend`

#### `util.style`

* 插入样式表

#### `util.encodeHTML` 方法

* html 转码

#### `util.pick` 方法

* 同 _.pick

#### `util.debounce`

#### `util.throttle`

#### `util.cookie` 方法

* 获取、设置document.cookie

#### `util.store` 方法

* 获取、设置localStorage

#### `util.equals` 方法

* 判断两个 Object、Array 结构和值是否相同（引用不同）

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

#### `util.timeLeft` 方法
```js

// 1天 00:10:00
util.timeLeft(10000000);

// 00:10:00
util.timeLeft(10000);
```

<br>

-------

<br>

## Zepto

```js
// 不推荐使用
import { $ } from 'snowball'
$('.class').on('click', ()=>alert(1));
```
