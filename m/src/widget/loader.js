var $ = require('$');
var _ = require('util');
var $empty = $();

var Promise = require("promise");
var extend = ['$el', '$refreshing', 'url', 'method', 'headers', 'dataType', 'xhrFields', 'beforeSend', 'success', 'error', 'complete', 'pageIndex', 'pageSize', 'append', 'checkEmptyData', 'check', 'hasData', 'KEY_PAGE', 'KEY_PAGESIZE', 'DATAKEY_TOTAL', 'MSG_NO_MORE'];

/*
@options = { 
    pageEnabled: true|false //是否自动加入分页判断,
    hasData: function(res){ return true|false; } //判断是否有数据,
    check: function(res) { return true|false; } //验证数据是否正确
}
*/
var Loader = function (options) {
    if (options.nodeType) options = {
        el: options
    };
    else if (options.length !== undefined && options[0].nodeType) options = {
        $el: options
    };

    $.extend(this, _.pick(options, extend));

    if (options.el)
        this.$el = $(options.el);
    !this.$el && (this.$el = $empty);
    this.el = this.$el[0];

    this.params = $.extend({}, this.params, options.params);
    this.$scroll = options.$scroll || this.$el;
    this.$content = options.$content || this.$scroll;
    this.pageEnabled = this.pageEnabled === false || options.pageEnabled === false ? false : (options.pageEnabled || this.append);
    options.showLoading != undefined && (this.isShowLoading = options.showLoading !== false && !!this.el);

    this.url && this.setUrl(this.url);

}

Loader.url = function (url) {
    return /^http\:\/\//.test(url) ? url : (this.prototype.baseUri.replace(/\/$/, '') + '/' + url.replace(/^\//, ''));
}

var _loader;

Loader.showLoading = function () {
    !_loader && (_loader = new Loader($("body")));

    _loader.showLoading();
}

Loader.hideLoading = function () {
    _loader && _loader.hideLoading();
}

Loader.prototype = {
    isShowLoading: true,

    KEY_PAGE: 'page',
    KEY_PAGESIZE: 'pageSize',

    DATAKEY_MSG: 'msg',
    DATAKEY_TOTAL: 'total',
    DATAKEY_PAGENUM: '',

    MSG_NO_MORE: '没有更多数据了',
    MSG_LOADING_MORE: '正在加载...',

    baseUri: $('meta[name="api-base-url"]').attr('content'),
    method: "POST",
    dataType: 'json',

    pageIndex: 1,
    pageSize: 10,

    template: '<div class="dataloading"></div>',
    refreshTemplate: '<div class="refreshing"><p class="loading js_loading"></p><p class="msg js_msg"></p></div>',
    errorTemplate: '<div class="server_error"><i class="msg js_msg"></i><i class="ico_reload js_reload"></i></div>',

    complete: _.noop,
    success: _.noop,
    error: _.noop,

    createError: function (errorCode, errorMsg) {
        return {
            success: false,
            code: errorCode,
            message: errorMsg
        }
    },

    check: function (res) {
        var flag = !!(res && res.success);
        return flag;
    },

    checkEmptyData: false,

    isEmptyData: function (res) {

        return (this._hasData = (this.checkEmptyData === false || this.hasData(res)));
    },

    hasData: function (res) {
        return !!(res.data && res.data.length);
    },

    showMoreLoading: function () {
        this.showMoreMsg(this.MSG_LOADING_MORE);
        this.$refreshing.find('.js_loading').show();
    },

    showMsg: function (msg) {
        if (this.pageIndex == 1) {
            this.$loading.find('.js_msg').show().html(msg);
            this.$loading.show().find('.js_loading').hide();
        } else {
            this.showMoreMsg(msg);
        }
    },

    showMoreMsg: function (msg) {

        var $refreshing = (this.$refreshing || (this.$refreshing = $(this.refreshTemplate)).appendTo(this.$content));

        $refreshing.find('.js_msg').show().html(msg);
        $refreshing.show().find('.js_loading').hide();
    },

    //@option='error message!' || {msg:'error message!',showReload:true}
    showError: function (option) {
        var that = this;

        if (this.pageIndex == 1) {

            that.$loading && this.$loading.animate({
                opacity: 0
            }, 300, 'ease-out', function () {
                that.$loading.hide().css({
                    opacity: ''
                });
            });

            var $error = (that.$error || (that.$error = $(that.errorTemplate).on('tap', '.js_reload', $.proxy(that.reload, that)).appendTo(that.$el)));

            if (typeof option == 'string') {
                option = {
                    msg: option,
                    showReload: true
                }
            }

            var $reload = $error.find('.js_reload');
            option.showReload ? $reload.show() : $reload.hide();

            $error.find('.js_msg').html(option.msg || '加载失败');
            $error.show();

        } else {
            that.showMsg('<div class="data-reload js_reload">加载失败，请点击重试<i class="i-refresh"></i></div>');
        }
    },

    showLoading: function () {
        var that = this,
            $refreshing;

        this.$error && this.$error.hide();

        this.isLoading = true;

        if (that.pageIndex == 1) {

            if (!that.$loading) {
                that.$loading = $(that.template).on($.fx.transitionEnd, function () {
                    if (!$(this).hasClass('show')) {
                        this.style.display = "none";
                    }
                });
            }
            that.$loading.show().appendTo(that.$el)[0].clientHeight;
            that.$loading.addClass('show');

            that.$refreshing && that.$refreshing.hide();

        } else {
            that.showMoreLoading();
            that.$loading && that.$loading.hide();
        }
    },

    hideLoading: function () {
        this.$error && this.$error.hide();
        this.$refreshing && this.$refreshing.hide();
        this.$loading.removeClass('show');

        this.isLoading = false;
    },

    setHeaders: function (key, val) {
        var attrs;
        if (!val)
            attrs = key
        else
            (attrs = {})[key] = val;

        if (this.headers === undefined) this.headers = {};

        for (var attr in attrs) {
            this.headers[attr] = attrs[attr];
        }
        return this;
    },

    clearParams: function () {
        this.params = {};
        return this;
    },

    setParam: function (key, val) {
        var attrs;
        if (!val)
            attrs = key
        else
            (attrs = {})[key] = val;

        for (var attr in attrs) {
            val = attrs[attr];

            if (attr == this.KEY_PAGE)
                this.pageIndex = val;
            else if (attr == this.KEY_PAGESIZE)
                this.pageSize = val
            else
                this.params[attr] = val;
        }
        return this;
    },

    getParam: function (key) {
        if (key) return this.params[key];
        return this.params;
    },

    setUrl: function (url) {
        this.url = /^http\:\/\//.test(url) ? url : (this.baseUri.replace(/\/$/, '') + '/' + url.replace(/^\//, ''));
        return this;
    },

    reload: function () {
        if (!this.isLoading) {
            this.pageIndex = 1;
            return this.request();
        }
    },

    request: function (resolve, reject) {
        var self = this;

        if (typeof resolve === 'function') {
            return this.request().then(resolve, reject)

        } else
            return new Promise(function (_resolve, _reject) {

                self._request(_resolve, _reject);
            });
    },

    _request: function (resolve, reject) {
        var that = this;

        if (that.beforeSend && that.beforeSend() === false) return;

        if (that.isLoading) return;
        that.isLoading = true;

        if (that.pageEnabled) {
            that.params[that.KEY_PAGE] = that.pageIndex;
            that.params[that.KEY_PAGESIZE] = that.pageSize;
        }

        that.isShowLoading && that.showLoading();

        that._xhr = $.ajax({
            url: that.url,
            headers: that.headers,
            xhrFields: that.xhrFields,
            data: that.params,
            type: that.method,
            dataType: 'json',
            cache: false,
            error: function (xhr) {
                that.isShowLoading && that.hideLoading();

                var err;
                try {
                    err = JSON.parse(xhr.responseText);
                } catch (e) { }

                !err && (err = that.createError(10001, '网络错误'));

                that.complete(err);

                that.error(err, xhr);

                reject && reject.call(that, err, xhr);

            },
            success: function (res, status, xhr) {
                that.isShowLoading && that.hideLoading();

                that.complete(res);

                if (!that.check || that.check(res)) {

                    if (that.isEmptyData(res)) {
                        if (that.pageIndex == 1 || !that.append) that.success(res, status, xhr);
                        else that.append(res, status, xhr);

                        if (that.append) that.checkAutoRefreshing(res);

                    } else {
                        that.dataNotFound(res);
                    }

                    resolve && resolve.call(that, res, status, xhr);

                } else {
                    if (!res.message && res.msg) res.message = res.msg;

                    that.error(res, xhr);
                    reject && reject.call(that, res, xhr);
                }
            },
            complete: function () {
                that._xhr = null;
                that.isLoading = false;
            }
        });

        return that;
    },

    autoLoadMore: function (append) {
        this.append = append;

        if (this._hasData) {
            this.pageIndex++;
            this.enableAutoRefreshing();
        }
    },

    _refresh: function () {
        this.abort().load();
    },

    dataNotFound: function () {
        if (this.pageIndex == 1) {
            this.showError('暂无数据');
        } else {

            this.disableAutoRefreshing();
        }
    },

    _scroll: function (e, options) {
        var that = this;

        if (!that.isLoading && options.height + options.y + options.height / 2 >= options.scrollHeight) {

            that._refresh();
        }
    },

    _autoRefreshingEnabled: false,

    checkAutoRefreshing: function (res) {
        var that = this,
            data = that.params;

        if (that.append && (!that.pageEnabled && that.hasData(res) ||
            ((that.DATAKEY_PAGENUM && res[that.DATAKEY_PAGENUM] && res[that.DATAKEY_PAGENUM] > data[that.KEY_PAGE]) ||
                (that.DATAKEY_TOTAL && res[that.DATAKEY_TOTAL] && res[that.DATAKEY_TOTAL] > data[that.KEY_PAGE] * parseInt(data[that.KEY_PAGESIZE]))))) {

            that.pageIndex++;
            that.enableAutoRefreshing();

        } else {
            that.disableAutoRefreshing();
        }
    },

    enableAutoRefreshing: function () {

        this.showMoreLoading('正在载入...');

        if (this._autoRefreshingEnabled) return;
        this._autoRefreshingEnabled = true;

        this.$scroll.on('scrollStop', $.proxy(this._scroll, this));

        var self = this;
        console.log('enableAutoRefreshing')

        setTimeout(function () {
            if (self.el && self.el.scrollTop + self.$scroll.height() >= self.$refreshing[0].offsetTop) {
                self._refresh();
            }
        }, 200);
    },

    disableAutoRefreshing: function () {
        if (!this._autoRefreshingEnabled) return;
        this._autoRefreshingEnabled = false;

        console.log('disableAutoRefreshing')

        this.$scroll.off('scrollStop', this._scroll);

        this.showMoreMsg(this.MSG_NO_MORE);
    },

    abort: function () {
        if (this._xhr) {
            this.isLoad = false;
            this._xhr.abort();
            this._xhr = null;

            this.hideLoading();
        }
        return this;
    },

    destroy: function () {
        this.abort();
        this.disableAutoRefreshing();
        this.$error && this.$error.off('tap', '.js_reload', this.reload);
    }
};

Loader.prototype.load = Loader.prototype.request;

Loader.extend = _.extend;


//@params={url, attribute, scroll, model, beforeRender}
Loader.pageLoader = function (params) {
    var model = params.model;
    var attribute = params.attribute || 'data';

    return new Loader({
        url: params.url,
        $el: $(params.el || model.$el[0]),

        $scroll: $(params.scroll || model.refs.main || model.$el[0]),

        success: function (res) {

            params.beforeRender && params.beforeRender(res);

            model.set(attribute, res.data);
        },

        append: function (res) {
            params.beforeRender && params.beforeRender(res);

            model._(attribute).add(res.data);
        }
    });
}

module.exports = Loader;