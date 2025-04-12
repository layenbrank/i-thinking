import { __decorate, __metadata } from "tslib";
import dayjs, {} from 'dayjs';
import { Singleton } from '../singleton';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import toArray from 'dayjs/plugin/toArray';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isYesterday from 'dayjs/plugin/isYesterday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
class FormatStrategy {
    format(date, format = 'YYYY-MM-DD HH:mm:ss') {
        return dayjs(date).format(format);
    }
}
class CalculationStrategy {
    add(targetDate, amount, unit) {
        return dayjs(targetDate).add(amount, unit);
    }
    subtract(targetDate, amount, unit) {
        return dayjs(targetDate).subtract(amount, unit);
    }
    diff(baseDate, compareDate, unit) {
        return dayjs(baseDate).diff(dayjs(compareDate), unit);
    }
}
class WorkdayStrategy {
    config;
    constructor(config) {
        this.config = config;
    }
    isWorkday(target, format, workDays) {
        const locale = this.config.locale || 'zh-cn';
        const weekday = dayjs(target).weekday();
        const weeksMaps = {
            short: {
                'zh-cn': ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            },
            long: {
                'zh-cn': ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
                en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            }
        };
        const dayName = weeksMaps[format ?? 'short'][locale][weekday];
        return (workDays ?? ['周一', '周二', '周三', '周四', '周五']).includes(dayName);
    }
    nextWorkday(source) {
        let target = dayjs(source).add(1, 'day');
        while (!this.isWorkday(target)) {
            target = target.add(1, 'day');
        }
        return target;
    }
    countWorkdays(source, target) {
        let count = 0;
        let currentDate = dayjs(source);
        const lastDate = dayjs(target);
        while (currentDate.isBefore(lastDate) || currentDate.isSame(lastDate)) {
            if (this.isWorkday(currentDate)) {
                count++;
            }
            currentDate = currentDate.add(1, 'day');
        }
        return count;
    }
}
class WeekStrategy {
    config;
    parse;
    constructor(config, parse) {
        this.config = config;
        this.parse = (parse ?? this.config.utc) ? dayjs.utc : dayjs;
    }
    week(target, format) {
        const locale = this.config.locale ?? dayjs().local().toString();
        const weeksMaps = {
            short: {
                'zh-cn': ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            },
            long: {
                'zh-cn': ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
                en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            }
        };
        return weeksMaps[format][locale][dayjs(target).weekday()];
    }
    weekStartOf(target) {
        const parsed = this.parse(target);
        const isZh = this.config.locale?.startsWith('zh');
        return parsed.locale(isZh ? 'zh-cn' : 'en').startOf('week');
    }
    weekEndOf(target) {
        const parsed = this.parse(target);
        const isZh = this.config.locale?.startsWith('zh');
        return parsed.locale(isZh ? 'zh-cn' : 'en').endOf('week');
    }
    weekDay(target, type) {
        const weekDayMap = {
            day: (target) => dayjs(target).day(),
            weekday: (target) => dayjs(target).weekday(),
            isoWeekday: (target) => dayjs(target).isoWeekday()
        };
        return weekDayMap[type](target);
    }
}
let TimeSphere = class TimeSphere {
    config;
    formatStrategy;
    calculationStrategy;
    workdayStrategy;
    weekStrategy;
    constructor() {
        dayjs.extend(utc);
        dayjs.extend(timezone);
        dayjs.extend(relativeTime);
        dayjs.extend(duration);
        dayjs.extend(toArray);
        dayjs.extend(customParseFormat);
        dayjs.extend(isToday);
        dayjs.extend(isTomorrow);
        dayjs.extend(isYesterday);
        dayjs.extend(weekOfYear);
        dayjs.extend(weekYear);
        dayjs.extend(weekday);
        dayjs.extend(isoWeek);
        dayjs.extend(isoWeeksInYear);
        dayjs.extend(isSameOrBefore);
        dayjs.extend(isSameOrAfter);
        dayjs.extend(isBetween);
        dayjs.extend(quarterOfYear);
        dayjs.extend(dayOfYear);
        dayjs.extend(isLeapYear);
        dayjs.extend(updateLocale);
        this.config = {
            timezone: 'Asia/Shanghai',
            locale: 'zh-cn',
            format: 'YYYY-MM-DD HH:mm:ss',
            utc: false
        };
        dayjs.locale(this.config.locale);
        this.formatStrategy = new FormatStrategy();
        this.calculationStrategy = new CalculationStrategy();
        this.workdayStrategy = new WorkdayStrategy(this.config);
        this.weekStrategy = new WeekStrategy(this.config, this.parse);
    }
    async init() {
        try {
            if (this.config.locale)
                dayjs.locale(this.config.locale);
            if (this.config.timezone)
                dayjs.tz.setDefault(this.config.timezone);
        }
        catch (error) {
            console.warn('Failed to initialize TimeSphere:', error);
        }
    }
    async updateConfig(config) {
        Object.assign(this.config, config);
        await this.init();
    }
    now() {
        return this.config.utc ? dayjs.utc() : dayjs();
    }
    parse(target) {
        return this.config.utc ? dayjs.utc(target) : dayjs(target);
    }
    format(date, format) {
        return this.formatStrategy.format(date, format || this.config.format);
    }
    fromNow(date) {
        return this.parse(date).fromNow();
    }
    isValid(date) {
        return this.parse(date).isValid();
    }
    compare(source, target) {
        const base = this.parse(source);
        const compare = this.parse(target);
        if (base.isBefore(compare))
            return -1;
        if (base.isAfter(compare))
            return 1;
        return 0;
    }
    add(target, amount, unit) {
        return this.calculationStrategy.add(target, amount, unit);
    }
    subtract(target, amount, unit) {
        return this.calculationStrategy.subtract(target, amount, unit);
    }
    diff(source, target, unit) {
        return this.calculationStrategy.diff(source, target, unit);
    }
    isBetween(target, rangeStart, rangeEnd, unit) {
        return this.parse(target).isBetween(this.parse(rangeStart), this.parse(rangeEnd), unit);
    }
    isWorkday(target, format, workDays) {
        return this.workdayStrategy.isWorkday(target, format, workDays);
    }
    nextWorkday(target) {
        return this.workdayStrategy.nextWorkday(target);
    }
    countWorkdays(source, target) {
        return this.workdayStrategy.countWorkdays(source, target);
    }
    dayOfYear(target) {
        return this.parse(target).dayOfYear();
    }
    dayOfMonth(target) {
        return this.parse(target).date();
    }
    dayStartOf(target) {
        return this.parse(target).startOf('day');
    }
    dayEndOf(target) {
        return this.parse(target).endOf('day');
    }
    isToday(target) {
        return dayjs(target).isToday();
    }
    isTomorrow(target) {
        return dayjs(target).isTomorrow();
    }
    isYesterday(target) {
        return dayjs(target).isYesterday();
    }
    quarter(target) {
        return this.parse(target).quarter();
    }
    quarterStartOf(target) {
        return this.parse(target).startOf('quarter');
    }
    quarterEndOf(target) {
        return this.parse(target).endOf('quarter');
    }
    week(target, format) {
        return this.weekStrategy.week(target, format);
    }
    weekOfYear(target) {
        return this.parse(target).week();
    }
    weekOfMonth(target) {
        const parsed = this.parse(target);
        const monthStart = parsed.startOf('month');
        const firstWeekday = monthStart.day();
        const dayOfMonth = parsed.date();
        const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
        return Math.ceil((dayOfMonth + offset) / 7);
    }
    weekStartOf(target) {
        return this.weekStrategy.weekStartOf(target);
    }
    weekEndOf(target) {
        return this.weekStrategy.weekEndOf(target);
    }
    weekDay(target, type) {
        return this.weekStrategy.weekDay(target, type);
    }
    isWeekend(target) {
        const weekendDays = new Set([0, 6]);
        return weekendDays.has(this.parse(target).weekday());
    }
};
TimeSphere = __decorate([
    Singleton(),
    __metadata("design:paramtypes", [])
], TimeSphere);
export const timeSphere = new TimeSphere();
//# sourceMappingURL=index.js.map