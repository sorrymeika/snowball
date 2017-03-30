var LinkList = function () {
    this._idlePrev = this;
    this._idleNext = this;
};

var next = function (item) {
    if (item._idlePrev == item) return null;
    return item._idlePrev;
};

var remove = function (item) {
    if (item._idleNext) {
        item._idleNext._idlePrev = item._idlePrev;
    }

    if (item._idlePrev) {
        item._idlePrev._idleNext = item._idleNext;
    }

    item._idleNext = null;
    item._idlePrev = null;
};

LinkList.prototype = {
    length: 0,

    init: function (item) {
        item = { data: item };
        this.list = item;
        this.length = 1;

        item._idleNext = item;
        item._idlePrev = item;
    },

    get: function (fn) {
        var result = null;

        this.each(function (item) {
            if (fn(item) === true) {
                result = item;
                return false;
            }
        });

        return result;
    },

    find: function (fn) {
        var result = [];

        this.each(function (item) {
            if (fn(item) === true) {
                result.push(item);
            }
        });

        return result;
    },

    first: function () {
        return this._idlePrev != this ? this._idlePrev.data : null;
    },

    peek: function () {
        return this._idlePrev == this ? null : this._idlePrev;
    },

    each: function (fn) {
        var first = this._idlePrev,
            nextItem;

        while (first != this) {
            nextItem = first._idlePrev;

            if (fn.call(first, first.data) === false) break;

            first = nextItem;
        }
    },

    next: next,

    append: function (item, unsafe) {
        if (!unsafe) item = { data: item };

        item._idleNext = this._idleNext;
        this._idleNext._idlePrev = item;
        item._idlePrev = this;
        this._idleNext = item;
        this.length++;

        return item;
    },

    contains: function (item) {
        var res = false;
        this.each(function (cItem) {
            if (item === cItem) {
                res = true;
                return false;
            }
        });
        return res;
    },

    shift: function () {
        var first = this._idlePrev;
        if (first != this) {
            this._remove(first);
            return first.data;
        } else {
            return null;
        }
    },

    _remove: function (item) {
        if (this.length == 0) return;

        this.length--;
        remove(item);
    },

    remove: function (item) {
        var that = this;

        that.each(function (cItem) {
            if (cItem === item) {
                that._remove(this);
                return false;
            }
        });
    },

    isEmpty: function () {
        return this._idlePrev == this;
    }
};

module.exports = LinkList;
