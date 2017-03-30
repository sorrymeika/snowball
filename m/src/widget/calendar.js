define(function (require, exports, module) {
    var $ = require('$'),
        util = require('util'),
        Selector = require('./selector');


    //@options={ onChange: function(date='2018-01-02'){ } }
    var Calendar = function (options) {
        var self = this;

        if (options) {
            if (options.onChange) this.onChange = options.onChange;
        }

        var years = [];
        var months = [];
        var now = new Date;
        var currentYear = now.getFullYear();
        var currentMonth = now.getMonth() + 1;
        var today = now.getDay();

        this.daysArray = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        for (var i = 1949; i <= currentYear + 10; i++) {
            years.push({
                text: i,
                value: i
            });
        }

        for (var i = 1; i <= 12; i++) {
            months.push({
                text: i,
                value: i
            });
        }

        self.selector = new Selector({
            options: [{
                template: '<li><%=text%></li>',
                data: years,
                onChange: function (i, data) {
                    self.year = data.value;
                    self.dateChange();
                }

            }, {
                template: '<li><%=text%></li>',
                data: months,
                onChange: function (i, data) {
                    self.month = data.value;
                    self.dateChange();
                }
            }, {
                template: '<li><%=text%></li>'
            }],

            complete: function (res) {
                self.onChange(res[0].value + '-' + util.pad(res[1].value) + '-' + util.pad(res[2].value));
            }
        });

        this.set(now);
    }

    Calendar.prototype.onChange = function () {
    }

    Calendar.prototype.dateChange = function () {
        var year = this.year;
        this.daysArray[1] = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) ? 29 : 28;
        var day = this.daysArray[this.month - 1];

        if (day != this.days) {
            var days = [];

            for (var i = 1; i <= day; i++) {
                days.push({
                    text: i,
                    value: i
                });
            }

            this.selector.eq(2).set(days).val(day);
        }
    }

    Calendar.prototype.set = function (date) {
        if (!date) {
            date = new Date();

        } else if (typeof date == 'number') {
            date = new Date(date);

        } else if (typeof date == 'string') {
            date = new Date(Date.parse(date));
        }

        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        var day = date.getDate();

        if (this.year != year) {
            this.year = year;
            this.selector.eq(0).val(year);
        }

        if (this.month != month) {
            this.month = month;
            this.selector.eq(1).val(month);
        }

        if (this.day != day) {
            this.day = day;
            this.selector.eq(2);
        }

        this.dateChange();

        return this;
    }

    Calendar.prototype.show = function (date) {
        this.selector.show();
        return this;
    }

    Calendar.prototype.hide = function (date) {
        this.selector.hide();
        return this;
    }

    return Calendar;
});
