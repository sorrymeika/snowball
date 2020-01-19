
import { $, getPropertyNames, defineProxyProperty } from '../../utils';
import { ActivityOptions } from '../types';
import { Page } from './Page';
import ViewAdapter from './ViewAdapter';

const ACTIVITY_STATUS_INIT = 0;
const ACTIVITY_STATUS_CREATE = 1;
const ACTIVITY_STATUS_RESUME = 2;
const ACTIVITY_STATUS_PAUSE = 3;
const ACTIVITY_STATUS_DESTROY = 4;

const lifecycleNames = ['onInit', 'onQsChange', 'onShow', 'onCreate', 'onResume', 'onPause', 'onDestroy', 'shouldRender'];
const excludeProps = [...lifecycleNames, 'constructor'];

function isInjectableProp(propName) {
    return typeof propName === 'string' && !excludeProps.includes(propName) && /^[a-z]/.test(propName);
}

/**
 * 页面控制器
 * @param {*} viewClass 视图类
 * @param {*} location 地址信息
 * @param {Application} application 应用
 * @param {*} configs 转换props的方法
 */
export class Activity {

    constructor(controllerFactory: Function & { options: ActivityOptions, config: any }, location, application) {
        this.application = application;
        this.isActive = true;
        this.status = ACTIVITY_STATUS_INIT;

        this.$el = $('[route-path="' + location.path + '"][ssr]');
        if (!this.$el.length) {
            this.$el = $('<div class="app-view"'
                + (!application.currentActivity ? ' style="opacity:0"' : '')
                + ' route-path="' + location.path + '"></div>')
                .appendTo(application.rootElement);
        } else {
            this.$el.removeAttr('ssr');
        }
        this.location = location;
        this.el = this.$el[0];
        this.controllerFactory = controllerFactory;

        const { config, options } = controllerFactory;
        this.page = new Page(this, this.application.ctx, config);

        if (options) {
            this.transition = options.transition;
        }

        this._inited = false;
        this._isReady = false;
        this._onReadyCallbacks = [];
    }

    _init(props, cb) {
        this._inited = true;
        const store = {};

        let type = this.controllerFactory;

        if (type.$$typeof === 'snowball/app#controller') {
            const controllerInstance = type(props, this.page.ctx);
            const lifecycle = {};

            lifecycleNames.forEach((lifecycleName) => {
                controllerInstance[lifecycleName] && (lifecycle[lifecycleName] = controllerInstance[lifecycleName].bind(controllerInstance));
            });

            this.page.setLifecycleDelegate(lifecycle);

            const propertyNames = getPropertyNames(controllerInstance);
            propertyNames.forEach((propertyName) => {
                if (isInjectableProp(propertyName)) {
                    defineProxyProperty(store, propertyName, controllerInstance);
                }
            });
            type = type.componentClass;
        }

        this.view = ViewAdapter.create(type, {
            page: this.page,
            ctx: this.page.ctx,
            el: this.el,
            store,
            activity: this
        });

        this.view.init(props, () => {
            this.lifecycle.onInit && this.lifecycle.onInit(this.page.ctx);
            this.page.trigger('init');

            this._isReady = true;
            this._onReadyCallbacks.forEach((fn) => fn());
            this._onReadyCallbacks = null;

            cb && cb();
        });
    }

    setProps(props, cb) {
        if (this._inited) {
            this.view.update(props, cb);
        } else {
            this._init(props, cb);
        }
        return this;
    }

    ready(fn) {
        if (this._isReady) {
            fn();
        } else {
            this._onReadyCallbacks.push(fn);
        }
    }

    setTransitionTask(transitionTask) {
        this.transitionTask = transitionTask;
        return this;
    }

    whenNotInTransition(fn) {
        if (!this.transitionTask) {
            console.error('call `setTransitionTask` first!');
            fn();
            return;
        }
        this.transitionTask.then(fn);
        return this;
    }

    qsChange() {
        if (typeof this.lifecycle.onQsChange === 'function') {
            this.lifecycle.onQsChange(this.page.ctx);
        }
        this.page.trigger('qschange');
    }

    /**
     * 页面显示，动画结束时触发
     * 若有上个页面，等待上个页面销毁或pause时触发
     * @param {*} callback
     */
    show(callback) {
        this.ready(() => {
            this.isActive = true;
            this.$el.addClass('app-view-actived');
            if (typeof this.lifecycle.onShow === 'function') {
                this.lifecycle.onShow(this.page.ctx);
            }
            this.page.trigger('show');
            callback && callback();
        });
    }

    /**
     * 页面进入前台时调用，若是第一次进入，则触发create，否则触发resume
     */
    active() {
        if (this.status == ACTIVITY_STATUS_INIT) {
            this.status = ACTIVITY_STATUS_CREATE;
            if (typeof this.lifecycle.onCreate === 'function') {
                this.lifecycle.onCreate(this.page.ctx);
            }
            this.page.trigger('create');
        } else if (this.status == ACTIVITY_STATUS_PAUSE) {
            this.status = ACTIVITY_STATUS_RESUME;
            if (typeof this.lifecycle.onResume === 'function') {
                this.lifecycle.onResume(this.page.ctx);
            }
            this.page.trigger('resume');
        }
        return this;
    }

    /**
     * 页面进入底层时调用
     */
    pause() {
        if (this.status == ACTIVITY_STATUS_RESUME || this.status == ACTIVITY_STATUS_CREATE || this.status == ACTIVITY_STATUS_INIT) {
            this.status = ACTIVITY_STATUS_PAUSE;
            this.isActive = false;
            if (typeof this.lifecycle.onPause === 'function') {
                this.lifecycle.onPause(this.page.ctx);
            }
            document.activeElement && document.activeElement.blur();
            this.page.trigger('pause');
        }
        return this;
    }

    /**
     * 销毁当前页面，调用navigation.back()时会销毁当前页面
     */
    destroy() {
        if (!this.isDestroyed) {
            this.isDestroyed = true;
            this.isActive = false;
            this.status = ACTIVITY_STATUS_DESTROY;

            document.activeElement && document.activeElement.blur();

            this.view.destroy();
            this.view = null;
            this.$el.remove();
            this.$el = this.el = null;

            if (typeof this.lifecycle.onDestroy === 'function') {
                this.lifecycle.onDestroy(this.page.ctx);
            }
            this.page.trigger('destroy');
            this.page.off();
        }
    }
}

Activity.prototype.lifecycle = {};

export default Activity;