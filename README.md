# Snowball

* `snowball` 是一个一站式前端开发框架，你可以使用`snowball`轻松构建出一套`web app/hybrid app`。`snowball`内置了`view`层，但同时也支持`React`。它比`React`全家桶轻量又支持更多功能，如下：
* 依赖注入：通过注解进行依赖注入。 
* 路由系统：拥有多工程跨工程加载、页面切换前进后退动画效果、手势返回、动态管理DOM等功能。 
* 状态管理：immutable、响应式，和`redux`不同，`snowball`的状态管理更符合`OOP`思想。
* 视图：fiber模式渲染，高性能，双向绑定。 支持字符串模版，采用运行时模版编译。
* 路由系统和状态管理都完全适配`React`。
* 业务项目采用分层架构，主要分为`Controller`、`Service`、`View`层，`Controller`层用来组织`Service`层，并将数据注入到`View`层。


## 路由

```
该路由方案专为多团队协作开发设计，将多个库整合成一个单页应用，让所有业务都使用相同的跳转动画、手势返回、页面缓存。
发布后到业务库共用一份核心库的js/css/image/iconfont，减少下载资源的大小。
一个核心框架库＋多个业务库。业务库之间不依赖，可单独发布。
```

### 多工程跨工程加载

1. 核心框架 `snowball` 统一控制路由，需要在 `snowball` 中注册需要加载的业务
2. 业务库打包后会生成`asset-manifest.json`文件，`snowball` 通过路由匹配到业务，并加载manifest中的js和css。
3. 业务js加载时调用`registerRoutes({...})` 方法注册子路由
4. `snowball` 在业务js／css加载完成后，根据业务注册的子路由跳至对应页面。

### 跳转动画和手势返回

1. 应用启动后，可使用 `navigation.forward` 和 `navigation.back` 方法来控制页面跳转的动画效果。使用 `navigation.forward` 跳转页面后，点击浏览器`返回上一页`会自带返回动画。若无需跳转动画可使用 `navigation.transitionTo` 方法。
2. 应用默认开启`手势返回`功能，`navigation.forward` 跳转到新页面之后，左滑页面可返回上一页。
3. 页面`render`时会监听dom数量，若dom数量超过指定数量(默认20k)，会自动umount老页面的dom。


## 状态管理

1. 内置多种数据类型，如`Model`和`Collection`，`Collection`类中包含多种常用数组操作方法
2. `immutable`，数据变更后对比非常方便
3. 使用观察者模式并且提供多种操作函数，轻松监听数据的变化

## 内置视图

`snowball`的视图层采用专有的模版语言、实时模版编译和`fiber`模式渲染。视图层接收`string`类型模版，组件实例化后，`snowball`会对模版进行实时编译，生成虚拟`dom`。渲染阶段会对实体`dom`的生成和变更进行`分片`渲染，避免界面卡顿。


## 开发

### Use Snowball

1. run `git clone git@github.com:sorrymeika/snowball.git`
2. run `cd snowball && npm install`
3. run `npm run project yourProjectName` to create your own project
4. `import { env, Model } from "snowball"`
5. see `https://github.com/sorrymeika/juicy` or `https://github.com/sorrymeika/sn-pyarmid` to get the full example!

### Getting Start

* run `cd yourProject && npm start` to start development server, it'll open the project url in browser automatically!
* run `npm run test` to run test cases!
* run `npm run build` to build the production bundle.
* run `npm run sprity` to build sprity images.
* to see the built project, please visit `http://localhost:3000/dist/#/`

## 安装常见问题

**if you get some error about `canvas`**

* run `brew install pkgconfig` if show "**pkg-config: command not found**"
* run `brew install cairo` if show "**No package 'cairo' found**"
* if you don't have **brew** command in your computer, see the [brew installation](https://brew.sh/)
* install the [XQuartz](https://www.xquartz.org/)

**or**

* see the [Installation OSX](https://github.com/Automattic/node-canvas/wiki/Installation---OSX) to install without **brew** command

**or**

* just remove the `canvas` module from `package.json`


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
* `Controller`层用来组织`Service`层，并将`service`和`状态`注入到`View`层

```html
snowball-project
├── package.json
├── index.js
├── app
|   ├── router.js
│   └── home <!-- 业务文件夹 -->
│       ├── controllers 
│       ├── services <!-- 业务服务 -->
│       ├── scss 
│       ├── containers 
│       └── components
├── shared
│   ├── models <!-- 公共模型 -->
│   └── services <!-- 公共服务 -->
```

## 启动应用

* `index.js` 创建并启动应用

```js
import { createApplication, lazy } from 'snowball/app';

const app = createApplication({
    projects: {
        "^/(subroute1|subroute2)/": 'http://localhost/subproject/assets-manifest.json'
    },
    routes: {
        '/': require('./app/home/controllers/HomeController'),
        // 异步加载
        '/item/\\d+:id': import('./app/item/controllers/ItemController'),
        // 懒加载
        '/type/\\d+:type(?:/\\d+:subType)?': lazy(() => import('./app/type/controllers/TypeController')),
    },
    options: {
        // 禁用跳转切换动画
        disableTrasition: true
    },
    // 对app进行扩展
    extend() {
        return {
            env: {
                api: 'https://**'
            },
            get server(){
                if (!this[SymbolServer]) {
                    this[SymbolServer] = new Server({
                        baseUrl: this.env.api
                    })
                }
                return this[SymbolServer];
            },
            // 注册服务到`app`中，注册的服务可通过 `this.app.service.xxx` 或 `this.ctx.service.xxx` 获取服务单例，如:
            //      this.app.service.user.getUser()
            //          .then((res) => {
            //              this.user = res.data;
            //          })
            services: {
                // 在此注册的 Service 无需继承 require('snowball/app').Service
                user: UserService
            }
        }
    }
}, document.getElementById('root'), callback);
```

* `domain/services/UserService.js`

```js
// Service 的接口必须定义
interface IUserService {
    getUser(): Promise<IUser>;
}

class UserService implements IUserService {
    getUser() {
        // Service 和 Controller 都可直接使用 app
        return this.app.server.post('/getUser');
    }
}
```

* `app/home/controllers/HomeController.js`

```js
import { controller, autowired } from "snowball/app";

// Controller
@controller(Home)
class HomeController {
    @autowired
    typeUIService;

    onInit() {
    }
}
```

* `app/home/containers/Home.jsx`

```js
import { observable } from "snowball";
import { observer } from "snowball/app";

@observer
class Home extends Component {
    // 在 React.Component 中 `attributes` 可和 `observer` 配合使用
    @observable.string
    ohNo = 'oh, no!!';

    ohYes = () => {
        this.ohNo = 'oh, yeah!!';
    }

    render() {
        return (
            <div >
                <p onClick={this.ohYes}>{this.ohNo}</p>
                <TypeSelect />
            </div>
        )
    }
}
```

* `app/home/containers/TypeSelect.jsx`

```js
import { inject } from "snowball/app";

// 可通过 `inject` 方法将 `controller` 的属性注入到组件的 `props` 中
// `controller` 中以 `_`和'$'开头的属性会认为是私有属性，不可注入
const TypeSelect = inject(({ typeUIService }) => (
    typeUIService
    ? {
        types: typeUIService.types,
        onTypeChange: typeUIService.onTypeChange.emit,
        onInit: typeUIService.onInit.emit
    }
    : null
))((props) => {
    const { type, subTypes, onInit, onTypeChange } = props;

    useEffect(() => {
        onInit();
    }, [onInit])

    return (
        <>
            <select onChange={onTypeChange}>{types.map((type)=><option value={type.id}>{type.name}<option>)}</select>
            <select>{subTypes.map((subType)=><option>{subType.name}<option>)}</select>
        </>
    );
})
```

* `app/shared/services/TypeUIService.js`

```js
import { observable } from 'snowball';
import { Service } from 'snowball/app';

// 在 Controller 中实例化的 Service 必须继承 `Service`
class TypeUIService extends Service {
    @observable types = [];
    @observable subTypes = [];

    // 创建事件
    onInit = this.ctx.createEmitter();
    onTypeChange = this.ctx.createEmitter();

    constructor() {
        this.onTypeChange((typeId) => this.changeType(typeId));
        // 仅执行一次
        this.onInit.once(() => this.init());
    }

    init() {
        this.types = await this.app.server.post('/getTypes');
    }

    changeType(typeId) {
        this.subTypes = await this.app.server.post('/getSubTypes', typeId);
    }
}
```


### 控制层 `controllers`

* 控制层，可依赖`shared`,`components`,`models`,`services`，主要用来处理UI状态、整合service并暴露给UI等，本层一般只做整合，是页面/组件和应用层service的中介。

#### `@controller` 方法

* 关联页面/组件跟Controller类的方法，一般使用修饰符模式

#### `@autowired` 方法

* 自动装载依赖

#### 例

```js
import { controller } from "snowball";
import Home from "../containers/Home";

/**
 * Controller类生命周期
 *     onInit: 页面第一次打开，且动画开始前触发
 *     onShow: 页面显示，动画结束时触发
 *     onCreate: 页面第一次打开，且动画结束后触发
 *     onResume: 页面从后台进入前台，且动画结束时触发
 *     onPause: 页面从前台进入后台，且动画结束时触发
 *     onDestroy: 页面被销毁后触发
 * Controller方法、属性排序
 *     constructor
 *     页面生命周期
 *     属性 (get, set)
 *     方法
 */
@controller({
    component: Home,
    configuration: HomeConfiguration
})
export default class HomeController {
    // 将url上的参数或configuration.parameters的配置自动注入到this.type上
    // 同等于 @param('type', { 
    //    type: 'number' // 数据类型
    // });
    @param
    type;

    @autowired
    userService;

    constructor(props, ctx) {
        // 框架会自动带入路由参数到 props 中
        // props.location.params 为路由 `/product/:type/:id ` 中的配置
        // props.location.query 为hash链接`?`后面的参数
        const id = ctx.location.params.id;
        const type = ctx.location.params.type;

        console.log('this.type === type:', this.type, type)

        // /home?source=wap&id=1
        // 此时 props.location.query 为 { source: 'wap',id: 1 }
        console.log(ctx.location.query);

        // 页面信息
        // 页面是否是激活状态
        // console.log(ctx.page.isActive());
        // 页面是否是销毁
        // console.log(ctx.page.isDestroyed());
    }

    // 页面初始化事件，数据请求不要放到 `constructor` 里，而是放在 `onInit` 里
    async onInit() {
        await this.userService.fetch();

        // 缓存页面数据到localStorage
        this.ctx.page.setCache({
            user: this.user
        });
    }

    onPause() {
    }

    onResume() {
    }

    onDestroy() {
    }

    get user() {
        return this.userService.getModel();
    }

    handleTitleClick() {
        this.userService.update();
    }
}
```

<br>

-------

<br>



### 服务层 `services`

* 服务层，主要作用为调用服务端接口，存储UI状态，处理业务逻辑。应用services间可互相调用。必须写interface.

```js
import UserModel from "../models/UserModel";

export default class UserService implements IUserService {

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

    // 从服务端请求数据并保存到本地model，命名规范为 pull[Something](args)
    async pull() {
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
<br>

-------

<br>

### 页面层（containers）

* 存放页面级组件，只负责展示和整合components，一般使用无状态组件，事件和业务逻辑操作统一交给`controllers`或`services`来处理。可依赖`components`

```js
var User = function (props) {
    // 被映射的数据
    console.log(props.user);

    return <div onClick={controller.onClick}>{props.user.name}</div>;
}
```

### `inject` 方法

* `controller`的属性和方法以及`provide`提供的属性和方法，可通过inject方法跨组件注入到子组件的props中

```js
import { inject } from 'snowball';

// 尽量使用修饰符和字符串参数，保证传 `props` 时能够覆盖 `context`
@inject('home', 'child')
class SomeComponent extends Component {
}

// `return`的属性会覆盖`props`的属性
inject(({ user, data }, props)=>{
    return {
        user,
        data
    }
})(Component)
```

<br>

-------

<br>

### 应用和路由

#### `createApplication` 方法

* 启动应用

```js
import { createApplication, configuration, singleton } from 'snowball';
import HomeController from 'controller/HomeController';

// 子应用根路由注册
const projects = {
    "^/trade(?=/|)": "https://project.com/asset-manifest.json"
};
// 主应用路由注册，不可和子应用根路由重合
// 尽量把路由收敛到 `routes.js` 中
const routes = {
    '/': HomeController,
    '/product': import('controllers/ProductController')
};
// 启动应用
const app = createApplication({
    projects,
    routes,
    configuration: configuration({
        modules: {
            userService: singleton(UserService)
        }
    }),
    options: {
        // 禁用跳转切换动画
        disableTrasition: true
    }
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


### app 和 ctx 应用上下文

* 可在`Controller`和`Service`中使用`app`和`ctx`属性
* `app`是应用级的，`ctx`是页面级的。`createApplication`时通过`extend`扩展的属性都会挂到`app`上面。

```js
import { controller } from 'snowball/app';
import User from './components/User';

@controller(User)
class UserController {
    @autowired
    _userService;
    
    constructor(props, ctx) {
        this.userId = ctx.location.params.id;
    }

    transitionToFav() {
        this.ctx.navigation.forward('/fav', {
            platform: this.app.env.PLATFORM
        })
    }
}

class UserService extends Service {
    transitionToOrder() {
        this.ctx.navigation.forward('/order')
    }
}
```

### `ctx.createEmitter` 

* 创建页面级事件

```js

this.onClick = this.ctx.createEmitter();

this.onClick((data, event) => {
    console.log(data);
    event.stopPropagation();
})

this.onClick((data, event) => {
    console.log('propagation stopped');
});

this.onClick.emit({ name: 'on no!' });
```


### `ctx.page` 属性

* 页面信息

```js
// 当前页面是否活跃
ctx.page.isActive();

// 当前页面是否已被销毁
ctx.page.isDestroyed();

// 页面标题
ctx.page.title;

// 获取dom节点
ctx.page.findNode(selector);
ctx.page.findNodeAll(selector);
```


### `ctx.navigation` 页面跳转，同`app.navigation`

#### `ctx.navigation.forward` 方法

* 跳转页面，带前进动画

```js

// 跳转到商品页
ctx.navigation.forward('/item/1')

// 跳转并传入 props
ctx.navigation.forward('/item/2', {
    action: 'dofast'
})
```

#### `ctx.navigation.back` 方法

* 跳转页面，带返回动画

```js
// 返回到首页
ctx.navigation.back('/')

// 返回到首页并传入 props
ctx.navigation.back('/', {
    action: 'dofast'
})
```

#### `ctx.navigation.transitionTo` 方法

* 跳转页面

```js
/**
 * @param {string} [url] 跳转连接
 * @param {boolean} [isForward] 是否带前进动画，前进动画:true，后退动画:false，不填无动画
 * @param {object} [props] 传给下个页面的props 
 */

// 不带动画跳转返回到首页并动画跳转到商品页，这样使用history records才不会错乱
ctx.navigation.transitionTo('/')
    .forward('/product/5');

// 不带动画跳转
ctx.navigation.transitionTo('/product/4');
```

#### `ctx.navigation.replace` 方法

* 替换当前链接，覆盖最后一条历史

```js
ctx.navigation.replace('/error/notfound?error=店铺状态异常');
```


#### `ctx.navigation.home` 方法

* 返回到首页

```js
ctx.navigation.home()
```

#### `ctx.app`

* 同等于 `app`

#### `ctx.service`

* 同等于 `app.service`


## 扩展页面页面和`ctx`

```js
import { Page } from 'snowball/app';

// 生命周期
Page.extentions.lifecycle({
    initialize() {
        this.sharer = new Sharer();
    }

    onShow() {
        this.sharer.sync();
    }
});

// 扩展页面属性
Page.extentions.minxin({
    // console.log(this.ctx.page.newProp());
    newProp() {
        return 'newProp' + Date.now();
    }
});

// 扩展`ctx`
Page.extentions.ctx((page, ctx) => {
    const logger = {
        error: (message) => {
            console.error(ctx.location.url, ":", message);
        }
    }

    return {
        get logger(){
            return logger;
        }
    }
});
```

## Model

* `models/UserModel.js`

```js
import { Model, Collection, Reaction, observable } from 'snowball';
import { controller, service, observer } from 'snowball/app';

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
    @observable.number
    userId;

    @observable.string
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

```


## vm

* vm是一个MVVM框架，内置模版引擎和多种数据类型

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

* `on[event]` dom事件

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
    <button onclick="this.onButtonClick(user.userName)">Click 0</button>
    <button onclick="delegate.onButtonClick(user)">Click 1</button>
</div>
```


* `sn-repeat` 循环

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


* `sn-[componentName]` 或 `大写字母开头的标签` 引入其他组件

```html
<sn-tab class="tab" props="{{items:['生活服务','通信服务']}}"></sn-tab>
<Tab class="tab" props="{{items:['生活服务','通信服务']}}"></Tab>
```

#### `Observer` 类

* 可观察对象，类的数据变化可被监听
*  `Model`, `Collection`, `List`, `Dictionary`, `Frame`, `State` 都是 `Observer` 的子类，分别有不同的作用

```js
import { Observer, Model, Collection, List, Frame, State } from 'snowball';

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
#### `Model|Dictionary` 类

* `Observer` 的属性变化不能被监听，`Model|Dictionary` 的属性变化可被监听
* `Model` 是深拷贝，且是 `immutable` 的，`Dictionary` 浅拷贝对象，`Observer` 不拷贝对象可接收值类型

#### `List|Collection` 类

* List和Collection都是集合类，类实例及其子项的变化都可被监听
* `List` 的子项如果是Plain Object,会使用`Dictionary`存储,非Plain Object使用`Observer`存储
* `Collection` 的子项是 `Model`
* `List` 性能优于 `Collection`

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

### `State` 类

```js
const state = new State();

// 异步设置触发事件，并且会触发3次
state.set(1);
state.set(2);
state.set(3);

console.log(state.get());
// undefined
```

### `Frame` 类

```js
const emitter = new Frame();

// 每次界面渲染完成之后触发事件，并且会触发3次
emitter.set(1);
emitter.set(2);
emitter.set(3);

console.log(emitter.get());
// 3
```

### `observable`

```js
class User {
    @observable
    anyType;

    @observable.number
    userId = 0;

    @observable.string
    userName;

    @observable.object
    auth;
}

const user = User.from({
    userId: 1,
    userName: '张三'
});

// 监听user.userId
asObservable(user).observe('userId', ()=>{
});

// 计算user.userId
asObservable(user).compute('userId', (userId)=>{
    return 'userId:' + userId;
});

asObservable(user).set({
    name: 1
});

for (var key in user) {
    console.log(key);
}
// userId
// userName
```


<br>

-------

<br>

### 公共组件

#### MainScrollView|ScrollView

* 带滚动条和自动加载数据功能的组件

```js
import { ScrollView, MainScrollView, scrollUtils } from 'snowball/components';

/**
 * @param {function} [onScrollViewInit] 初始化事件
 * @param {function} [pullToRefresh] 下拉刷新
 * @param {function} [onScrollToBottom] 滚动到底部事件
 * @param {string|PagiationStatus} [loadMoreStatus] 加载更多状态
*/
const mainScrollViewHandler = scrollUtils.createScrollHandler();
mainScrollViewHandler.addOnScrollListener((e)=>{
    console.log(e, e.target, e.x, e.y);
});

<MainScrollView
    loadMoreStatus={PagiationStatus}
    onScrollToBottom={autoLoadMore}
    pullToRefresh={()=>{  }}
    handler={mainScrollViewHandler}
>
</MainScrollView>

<ScrollView onScroll={()=>{}} className="mk_shop__list">
<div>content</div>
</ScrollView>
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

###  `@component` 注解

```js
// 这是一个简单的 `component` 示例
@component({
    tagName: 'Order',
    template: `<div @click={user.name='new name'}>{user.name}</div>
    <ul>
        <li sn-repeat="item,i in orderList" @click={this.handleOrder(item, i)}>{i}:{item.tradeCode}</li>
    </ul>`
})
class Order extends Model {
    handleOrder(item, i) {
        console.log(item, i);
    }
}

new Order({
    user: {
        name: 'UserName'
    },
    orderList: [{
        tradeCode: '1234'
    }]
}).appendTo(document.body)
```


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
