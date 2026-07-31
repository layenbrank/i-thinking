/**
 * 日期时间工具（dayjs 全局单例门面）
 * @description
 * - 便捷使用 dayjs：入口统一走本实例，避免散落 `dayjs()` 导致插件/locale/时区不一致
 * - 补齐 dayjs 未直接提供的结构化日历结果：`day` / `month` / `quarter` / `year`
 * - 单例 + `updateOptions`：全局状态与配置一致，一键切换 timezone / locale / format / utc
 *
 * @example
 * ```typescript
 * const now = timeSphere.now()
 * console.log(timeSphere.format(now)) // 默认 options.format
 *
 * timeSphere.updateOptions({ locale: 'en', timezone: 'America/New_York' })
 * // 之后 parse / format / isToday / day(...) 均按新配置
 * ```
 *
 * @remarks
 * 日期操作不可变；相对日（isToday 等）与 fromNow 均相对 `now()`（配置时区），而非系统裸本地日。
 */

import dayjs, {
  type ConfigType,
  type Dayjs,
  type OpUnitType,
  type UnitType
} from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import dayOfYear from 'dayjs/plugin/dayOfYear'
import duration from 'dayjs/plugin/duration'
import isBetween from 'dayjs/plugin/isBetween'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import isoWeek from 'dayjs/plugin/isoWeek'
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isToday from 'dayjs/plugin/isToday'
import isTomorrow from 'dayjs/plugin/isTomorrow'
import isYesterday from 'dayjs/plugin/isYesterday'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import toArray from 'dayjs/plugin/toArray'
import updateLocale from 'dayjs/plugin/updateLocale'
import utc from 'dayjs/plugin/utc'
import weekday from 'dayjs/plugin/weekday'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import weekYear from 'dayjs/plugin/weekYear'
import { Singleton } from '@/singleton'
import type {
  DayReturnType,
  DayType,
  MonthReturnType,
  MonthType,
  QuarterReturnType,
  QuarterType,
  TimeSphereImpl,
  TimeSphereOptions,
  YearReturnType,
  YearType
} from './types'

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const TIME_LOCALE = 'zh-cn'
const TIME_ZONE = 'Asia/Shanghai'

/**
 * 日期时间服务实现（单例）
 */
@Singleton()
class TimeSphere implements TimeSphereImpl {
  private readonly options: TimeSphereOptions

  constructor() {
    dayjs.extend(utc)
    dayjs.extend(timezone)
    dayjs.extend(relativeTime)
    dayjs.extend(duration)
    dayjs.extend(toArray)
    dayjs.extend(customParseFormat)

    dayjs.extend(isToday)
    dayjs.extend(isTomorrow)
    dayjs.extend(isYesterday)

    dayjs.extend(weekOfYear)
    dayjs.extend(weekYear)
    dayjs.extend(weekday)
    dayjs.extend(isoWeek)
    dayjs.extend(isoWeeksInYear)

    dayjs.extend(isSameOrBefore)
    dayjs.extend(isSameOrAfter)
    dayjs.extend(isBetween)
    dayjs.extend(quarterOfYear)

    dayjs.extend(dayOfYear)
    dayjs.extend(isLeapYear)

    dayjs.extend(updateLocale)

    this.options = {
      timezone: TIME_ZONE,
      locale: TIME_LOCALE,
      format: TIME_FORMAT,
      utc: false
    }

    dayjs.locale(this.options.locale)
    dayjs.tz.setDefault(this.options.timezone)
  }

  updateOptions(options: Partial<TimeSphereOptions>) {
    Object.assign(this.options, options)

    if (this.options.locale) dayjs.locale(this.options.locale)
    if (this.options.timezone) dayjs.tz.setDefault(this.options.timezone)
  }

  findOptions(): Readonly<TimeSphereOptions> {
    return { ...this.options }
  }

  now(): Dayjs {
    if (this.options.utc) return dayjs.utc()
    return dayjs.tz(dayjs(), this.options.timezone ?? TIME_ZONE)
  }

  parse(target?: ConfigType): Dayjs {
    try {
      const parsed = this.options.utc
        ? dayjs.utc(target)
        : dayjs.tz(target, this.options.timezone ?? TIME_ZONE)
      return parsed.clone().locale(this.options.locale ?? TIME_LOCALE)
    } catch {
      return dayjs(NaN).locale(this.options.locale ?? TIME_LOCALE)
    }
  }

  format(datetime: ConfigType, format?: string): string {
    return this.parse(datetime).format(format ?? this.options.format ?? TIME_FORMAT)
  }

  fromNow(datetime: ConfigType, withoutSuffix?: boolean): string {
    return this.parse(datetime).from(this.now(), withoutSuffix)
  }

  toTimestamp(datetime: ConfigType): number {
    return this.parse(datetime).valueOf()
  }

  isValid(datetime: ConfigType): boolean {
    try {
      return this.parse(datetime).isValid()
    } catch {
      return false
    }
  }

  compare(source: ConfigType, target: ConfigType, unit: UnitType): number {
    const base = this.parse(source)
    const compare = this.parse(target)
    if (base.isBefore(compare, unit)) return -1
    if (base.isAfter(compare, unit)) return 1
    return 0
  }

  add(datetime: ConfigType, amount: number, unit: UnitType): Dayjs {
    return this.parse(datetime).add(amount, unit)
  }

  subtract(datetime: ConfigType, amount: number, unit: UnitType): Dayjs {
    return this.parse(datetime).subtract(amount, unit)
  }

  diff(source: ConfigType, target: ConfigType, unit: UnitType): number {
    return this.parse(source).diff(this.parse(target), unit)
  }

  isBetween(
    target: ConfigType,
    rangeStart: ConfigType,
    rangeEnd: ConfigType,
    unit?: OpUnitType
  ): boolean {
    return this.parse(target).isBetween(
      this.parse(rangeStart),
      this.parse(rangeEnd),
      unit
    )
  }

  isToday(target: ConfigType): boolean {
    return this.parse(target).isSame(this.now(), 'day')
  }

  isTomorrow(target: ConfigType): boolean {
    return this.parse(target).isSame(this.add(this.now(), 1, 'day'), 'day')
  }

  isYesterday(target: ConfigType): boolean {
    return this.parse(target).isSame(this.subtract(this.now(), 1, 'day'), 'day')
  }

  /**
   * 获取日维度信息或范围
   * @remarks
   * type: ofYear(年内第几天), ofMonth(月内第几天), begin/final(日起止), range/ranges(日范围)
   */
  day<T extends DayType>(
    target: ConfigType,
    type: T,
    rangeEnd?: ConfigType
  ): DayReturnType<T> {
    const parsed = this.parse(target)

    const reflection = {
      ofYear: () => parsed.dayOfYear(),
      ofMonth: () => parsed.date(),
      begin: () => parsed.clone().startOf('day'),
      final: () => parsed.clone().endOf('day'),
      range: () => {
        const begin = parsed.clone().startOf('day')
        const final = parsed.clone().endOf('day')

        return {
          begin: {
            date: begin.format('YYYY-MM-DD'),
            day: begin.format('DD'),
            month: begin.format('MM'),
            year: begin.format('YYYY'),
            dayOfWeek: begin.format('dddd'),
            isToday: this.isToday(begin)
          },
          final: {
            date: final.format('YYYY-MM-DD'),
            day: final.format('DD'),
            month: final.format('MM'),
            year: final.format('YYYY'),
            dayOfWeek: final.format('dddd'),
            isToday: this.isToday(final)
          }
        }
      },
      ranges: () => {
        const endDate = rangeEnd
          ? this.parse(rangeEnd)
          : parsed.clone().endOf('month')
        let current = parsed.clone().startOf('day')
        const final = endDate.clone().endOf('day')
        const days = []

        while (current.isSameOrBefore(final, 'day')) {
          days.push({
            date: current.format('YYYY-MM-DD'),
            day: current.format('DD'),
            month: current.format('MM'),
            year: current.format('YYYY'),
            dayOfWeek: current.format('dddd'),
            dayOfWeekShort: current.format('ddd'),
            isToday: this.isToday(current),
            isWeekend: current.day() === 0 || current.day() === 6,
            dayOfYear: current.dayOfYear(),
            dayOfMonth: current.date()
          })
          current = current.add(1, 'day')
        }

        return days
      }
    }

    return (
      reflection[type] ? reflection[type]() : reflection.begin()
    ) as DayReturnType<T>
  }

  /**
   * 获取季度数字、开始或结束时间、范围信息
   * @remarks
   * type: number(第几季度), begin(季度开始), final(季度结束), range(季度范围), ranges(季度内所有月份), next(下一季度)
   */
  quarter<T extends QuarterType>(
    target: ConfigType,
    type: T
  ): QuarterReturnType<T> {
    const parsed = this.parse(target)

    const reflection = {
      number: () => parsed.quarter(),
      begin: () => parsed.clone().startOf('quarter'),
      final: () => parsed.clone().endOf('quarter'),
      range: () => {
        const begin = parsed.clone().startOf('quarter')
        const final = parsed.clone().endOf('quarter')

        return {
          begin: {
            date: begin.format('YYYY-MM-DD'),
            quarter: begin.quarter(),
            month: begin.format('MM'),
            year: begin.format('YYYY')
          },
          final: {
            date: final.format('YYYY-MM-DD'),
            quarter: final.quarter(),
            month: final.format('MM'),
            year: final.format('YYYY')
          }
        }
      },
      ranges: () => {
        const quarterStart = parsed.clone().startOf('quarter')
        const quarterEnd = parsed.clone().endOf('quarter')
        const months = []
        let current = quarterStart.clone()

        while (current.isSameOrBefore(quarterEnd, 'month')) {
          months.push({
            date: current.format('YYYY-MM-DD'),
            month: current.month() + 1,
            monthName: current.format('MMMM'),
            monthShort: current.format('MMM'),
            year: current.year(),
            quarter: current.quarter(),
            daysInMonth: current.daysInMonth()
          })
          current = current.add(1, 'month')
        }

        return months
      },
      next: () => {
        const nextQuarter = parsed.clone().add(1, 'quarter')
        const begin = nextQuarter.clone().startOf('quarter')
        const final = nextQuarter.clone().endOf('quarter')

        return {
          begin: begin.format('YYYY-MM-DD'),
          final: final.format('YYYY-MM-DD'),
          quarter: nextQuarter.quarter(),
          year: nextQuarter.year()
        }
      }
    }

    return (
      reflection[type] ? reflection[type]() : reflection.number()
    ) as QuarterReturnType<T>
  }

  /**
   * 获取月份数字、开始或结束时间、范围信息
   * @remarks
   * type: number(月份数字), begin(月初), final(月末), range(月份范围), ranges(月份内所有天)
   */
  month<T extends MonthType>(target: ConfigType, type: T): MonthReturnType<T> {
    const parsed = this.parse(target)

    const reflection = {
      number: () => parsed.month() + 1,
      begin: () => parsed.clone().startOf('month'),
      final: () => parsed.clone().endOf('month'),
      range: () => {
        const begin = parsed.clone().startOf('month')
        const final = parsed.clone().endOf('month')

        return {
          begin: {
            date: begin.format('YYYY-MM-DD'),
            month: begin.month() + 1,
            monthName: begin.format('MMMM'),
            year: begin.format('YYYY')
          },
          final: {
            date: final.format('YYYY-MM-DD'),
            month: final.month() + 1,
            monthName: final.format('MMMM'),
            year: final.format('YYYY')
          },
          daysInMonth: parsed.daysInMonth()
        }
      },
      ranges: () => {
        const monthStart = parsed.clone().startOf('month')
        const monthEnd = parsed.clone().endOf('month')
        const days = []
        let current = monthStart.clone()

        const firstWeekday = monthStart.day()
        while (current.isSameOrBefore(monthEnd, 'day')) {
          const dayOfMonth = current.date()
          const offset = firstWeekday === 0 ? 6 : firstWeekday - 1
          const weekOfMonth = Math.ceil((dayOfMonth + offset) / 7)

          days.push({
            date: current.format('YYYY-MM-DD'),
            day: current.format('DD'),
            month: current.format('MM'),
            year: current.format('YYYY'),
            dayOfWeek: current.format('dddd'),
            dayOfWeekShort: current.format('ddd'),
            isToday: this.isToday(current),
            isWeekend: current.day() === 0 || current.day() === 6,
            weekOfMonth: weekOfMonth,
            dayOfYear: current.dayOfYear(),
            dayOfMonth: current.date()
          })
          current = current.add(1, 'day')
        }

        return days
      }
    }

    return (
      reflection[type] ? reflection[type]() : reflection.number()
    ) as MonthReturnType<T>
  }

  /**
   * 获取年份数字、开始或结束时间、范围信息
   */
  year<T extends YearType>(target: ConfigType, type: T): YearReturnType<T> {
    const parsed = this.parse(target)

    const reflection = {
      number: () => parsed.year(),
      begin: () => parsed.clone().startOf('year'),
      final: () => parsed.clone().endOf('year'),
      range: () => {
        const begin = parsed.clone().startOf('year')
        const final = parsed.clone().endOf('year')

        return {
          begin: {
            date: begin.format('YYYY-MM-DD'),
            year: begin.year()
          },
          final: {
            date: final.format('YYYY-MM-DD'),
            year: final.year()
          },
          isLeapYear: parsed.isLeapYear(),
          daysInYear: parsed.isLeapYear() ? 366 : 365
        }
      },
      ranges: () => {
        const yearStart = parsed.clone().startOf('year')
        const yearEnd = parsed.clone().endOf('year')
        const months = []
        let current = yearStart.clone()

        while (current.isSameOrBefore(yearEnd, 'month')) {
          months.push({
            date: current.format('YYYY-MM-DD'),
            month: current.month() + 1,
            monthName: current.format('MMMM'),
            monthShort: current.format('MMM'),
            year: current.year(),
            quarter: current.quarter(),
            daysInMonth: current.daysInMonth()
          })
          current = current.add(1, 'month')
        }

        return months
      }
    }

    return (
      reflection[type] ? reflection[type]() : reflection.number()
    ) as YearReturnType<T>
  }
}

const timeSphere = new TimeSphere()

export type {
  DayInfo,
  DayRange,
  DayReturnType,
  DayType,
  MonthInfo,
  MonthRange,
  MonthReturnType,
  MonthType,
  NextQuarterInfo,
  QuarterInfo,
  QuarterRange,
  QuarterReturnType,
  QuarterType,
  TimeSphereImpl,
  TimeSphereOptions,
  YearRange,
  YearReturnType,
  YearType
} from './types'

export { timeSphere }
