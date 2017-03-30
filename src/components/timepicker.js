var $ = require('$');
var util = require('util');
var model = require('core/model2');

var optionHeight = 20;

util.style('.calendar.curr{z-index:5001;width:280px;}.calendar{height:22px;padding:1px;zoom:1;display:inline-block;*display:inline;position:relative;overflow:visible;z-index:0;color:#000;width:280px;}\
        .calendar span {cursor:pointer;border:0;margin:0;padding:0 2px;height:20px;line-height:20px;display:inline-block;position:relative;color:#000;background-color:#f1f1f1;}\
        .calendar-icon{margin-top: 0px;display: inline-block;vertical-align: middle;position: relative;font-size: 12px;width: 10px;height: 8px;overflow: hidden;line-height: 12px;font-family: "SimSun";}\
        .calendar-icon em {display: inline-block;height: 0px;overflow: hidden;position: absolute;top: 0px;left: 0px;  border-top: 4px solid #000;border-right: 4px solid #fff;border-left: 4px solid #fff;}\
        .calendar-up .calendar-icon em {border-top: 4px solid #fff;border-bottom: 4px solid #000;}\
        .calendar-up,.calendar-down {cursor:pointer;}\
        .calendar-wrap {top:-90px;left:0;position:absolute;border:1px solid #cdcdcd;background:#fff;overflow:hidden;}\
        .calendar-bd {width:35px;text-align:center;float:left;}\
        .calendar-bd i { display: block; height: ' + optionHeight + 'px;font-style:normal; cursor: pointer; }\
        .calendar-con i { cursor: move; }\
        .calendar-con{height:200px;overflow:hidden;cursor:move;user-select:none;}\
        .calendar-bd i.curr { background: #ddd; }');

var TimePicker = model.ViewModel.extend({
    el: (<div class="calendar{isShow?' curr':''}" >
        <div sn-click="this.show()">
            <span><em>{yyyy}</em></span> /
            <span><em>{MM}</em></span> /
            <span><em>{dd}</em></span>
            <span><em>{hh}</em></span>&nbsp;:
            <span><em>{mm}</em></span>&nbsp;:
            <span><em>{ss}</em></span>
        </div>
        <div class="calendar-wrap" sn-display="{isShow}" style="display:none;">
            <div class="calendar-bd">
                <div class="calendar-up" sn-click="yearTop=0"><em class="calendar-icon"><em></em></em></div>
                <div class="calendar-con" key="yearTop"><div style="margin-top:-{yearTop}px"><i sn-repeat="item in years" class="{yyyy==item?'curr':''}" sn-click="this.setYear(item)">{item}</i></div></div>
                <div class="calendar-down" sn-click="yearTop=(years.length-10)*20"><em class="calendar-icon"><em></em></em></div>
                <i sn-click="this.today()">今天</i>
            </div>
            <div class="calendar-bd">
                <div class="calendar-up" sn-click="monthTop=0"><em class="calendar-icon"><em></em></em></div>
                <div class="calendar-con" key="monthTop"><div style="margin-top:-{monthTop}px"><i sn-repeat="item in months" class="{MM==item?'curr':''}" sn-click="this.setMonth(item)">{util.pad(item)}</i></div></div>
                <div class="calendar-down" sn-click="monthTop=(months.length-10)*20"><em class="calendar-icon"><em></em></em></div>
                <i sn-click="this.now()">现在</i>
            </div>
            <div class="calendar-bd">
                <div class="calendar-up" sn-click="dayTop=0"><em class="calendar-icon"><em></em></em></div>
                <div class="calendar-con" key="dayTop"><div style="margin-top:-{dayTop}px"><i sn-repeat="item in days" class="{dd==item?'curr':''}" sn-click="this.setDay(item)">{util.pad(item)}</i></div></div>
                <div class="calendar-down" sn-click="dayTop=(days.length-10)*20"><em class="calendar-icon"><em></em></em></div>
                <i sn-click="this.clearInput()">清空</i>
            </div>

            <div class="calendar-bd">
                <div class="calendar-up" sn-click="hourTop=0"><em class="calendar-icon"><em></em></em></div>
                <div class="calendar-con" key="hourTop"><div style="margin-top:-{hourTop}px"><i sn-repeat="item in hours" class="{hh==item?'curr':''}" sn-click="this.setHours(item)">{util.pad(item)}</i></div></div>
                <div class="calendar-down" sn-click="hourTop=(hours.length-10)*20"><em class="calendar-icon"><em></em></em></div>
            </div>
            <div class="calendar-bd">
                <div class="calendar-up" sn-click="minutesTop=0"><em class="calendar-icon"><em></em></em></div>
                <div class="calendar-con" key="minutesTop"><div style="margin-top:-{minutesTop}px"><i sn-repeat="item in minutes" class="{mm==item?'curr':''}" sn-click="this.setMinutes(item)">{util.pad(item)}</i></div></div>
                <div class="calendar-down" sn-click="minutesTop=(minutes.length-10)*20"><em class="calendar-icon"><em></em></em></div>
            </div>
            <div class="calendar-bd">
                <div class="calendar-up" sn-click="secondTop=0"><em class="calendar-icon"><em></em></em></div>
                <div class="calendar-con" key="secondTop"><div style="margin-top:-{secondTop}px"><i sn-repeat="item in seconds" class="{ss==item?'curr':''}" sn-click="this.setSeconds(item)">{util.pad(item)}</i></div></div>
                <div class="calendar-down" sn-click="secondTop=(seconds.length-10)*20"><em class="calendar-icon"><em></em></em></div>
                <i class="js_hide">确定</i>
            </div>
        </div>
    </div>),

    constructor: function ($input, options) {
        var now = new Date();
        var self = this;

        options = $.extend({
            yearFrom: now.getFullYear() - 30,
            yearTo: now.getFullYear() + 5
        }, options);

        this.$input = $input;

        this.aDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        var years = [];
        for (var i = options.yearFrom; i <= options.yearTo; i++) {
            years.push(i);
        }
        var months = [];
        for (var i = 1; i <= 12; i++) {
            months.push(i);
        }

        var hours = [];
        for (var i = 0; i <= 23; i++) {
            hours.push(i);
        }

        var minutes = [];
        var seconds = [];
        for (var i = 0; i <= 59; i++) {
            minutes.push(i);
            seconds.push(i);
        }

        model.ViewModel.call(this, {
            yyyy: '----',
            MM: '--',
            dd: '--',
            hh: '--',
            mm: '--',
            ss: '--',

            years: years,
            months: months,
            hours: hours,
            minutes: minutes,
            seconds: seconds
        });

        this.$el.insertBefore($input);

        var dragStart = false;
        var startY;
        var con;
        var topKey;
        var startMarginTop;
        var moved;
        this.$el.find('.calendar-wrap').on('mousedown', '.calendar-con', function (e) {
            startY = e.clientY;
            con = $(e.currentTarget).children('div');
            topKey = $(e.currentTarget).attr('key');
            startMarginTop = self.get(topKey) || 0;

            dragStart = true;
            moved = false;

        }).on('mousemove', '.calendar-con', function (e) {
            if (dragStart) {
                var dy = e.clientY - startY;
                moved = true;

                self.set(topKey, Math.min(e.currentTarget.firstElementChild.offsetHeight - 100, Math.max(0, startMarginTop - dy)));
            }

        }).on('mousewheel', '.calendar-con', function (e) {
            var deltaY = e.deltaY;
            var key = $(e.currentTarget).attr('key');

            self.set(key, Math.min(e.currentTarget.firstElementChild.offsetHeight - 100, Math.max(0, (self.get(key) || 0) + deltaY)));

            return false;

        }).on('click', function (e) {
            dragStart = false;
            if (moved) {
                moved = false;
                return false;
            }
        });
    },

    setYear: function (year, update) {
        this.set({
            yyyy: util.pad(year, 4),
            yearTop: (this.data.years.indexOf(year) - 4) * optionHeight
        });

        return this._syncDays()._update(update);
    },

    setMonth: function (month, update) {
        var index = this.data.months.indexOf(month);

        this.set({
            MM: util.pad(month),
            monthTop: (index - 4) * optionHeight
        });

        return this._syncDays()._update(update);
    },

    setDay: function (day, update) {

        return this.set({
            dd: util.pad(day),
            dayTop: (this.data.days.indexOf(day) - 4) * optionHeight
        })._update(update);
    },

    setHours: function (num, update) {

        return this.set({
            hh: util.pad(num),
            hourTop: (this.data.hours.indexOf(num) - 4) * optionHeight
        })._update(update);
    },

    setMinutes: function (num, update) {
        return this.set({
            mm: util.pad(num),
            minutesTop: (this.data.minutes.indexOf(num) - 4) * optionHeight
        })._update(update);
    },

    setSeconds: function (num, update) {

        return this.set({
            ss: util.pad(num),
            secondTop: (this.data.seconds.indexOf(num) - 4) * optionHeight
        })._update(update);
    },

    _syncDays: function () {

        var days = [];
        var index = this.data.months.indexOf(parseInt(this.data.MM));
        var year = parseInt(this.data.yyyy) || 0;
        if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) {
            this.aDays[1] = 29;
        } else {
            this.aDays[1] = 28;
        }
        var mDays = this.aDays[index];

        for (var i = 1; i <= mDays; i++) {
            days.push(i);
        }

        return this.set({
            dayIndex: 1,
            days: days
        });
    },

    today: function () {
        var now = new Date();

        return this.setYear(now.getFullYear())
            .setMonth(now.getMonth() + 1)
            .setDay(now.getDate());
    },

    now: function () {
        var now = new Date();

        return this.setTime(now);
    },

    setTime: function (time) {
        if (!time) {
            return this.clearInput();
        }

        if (typeof time == 'number' || (typeof time == 'string' && /^\d+$/.test(time))) {
            time = new Date(time);
        } else if (typeof time == 'string') {
            time = new Date(Date.parse(time));
        }

        return this.setYear(time.getFullYear(), false)
            .setMonth(time.getMonth() + 1, false)
            .setDay(time.getDate(), false)
            .setHours(time.getHours(), false)
            .setMinutes(time.getMinutes(), false)
            .setSeconds(time.getSeconds(), false)
            ._update();
    },

    clearInput: function () {

        return this.set({
            yyyy: '----',
            MM: '--',
            dd: '--',
            hh: '--',
            mm: '--',
            ss: '--'
        })._update();
    },

    _update: function (isUpdate) {

        if (isUpdate !== false) {
            var data = this.data;
            var time = data.yyyy != '----'
                ? (data.yyyy + '/' + data.MM + '/' + data.dd).replace(/--/g, '1') + ' ' + (data.hh + ':' + data.mm + ':' + data.ss).replace(/--/g, '00')
                : '';

            if (time != this.$input.val())
                this.$input.val(time).trigger('onTimeChange').trigger('change');
        }
        return this;
    },

    getTime: function () {
        return Date.parse(this.$input.val().replace(/-/g, '/')) || 0;
    },

    show: function () {
        var self = this;

        $(document.body).on('mouseup', function (e) {
            if (self.$el.has(e.target).length == 0 || $(e.target).hasClass('js_hide')) {
                self.hide();
                $(this).off('mouseup', arguments.callee);
            }
        });

        return this.set({
            isShow: true
        });
    },

    hide: function () {
        this.set({
            isShow: false
        });
    },

    val: function (time) {
        this.setTime(time);
    }
})

module.exports = TimePicker;
