/**
 * 日期时间工具
 * @description 基于 dayjs 的日期时间处理工具，支持全局配置、插件管理、国际化等特性。
 *
 * @example
 * ```typescript
 * // 基本使用
 * const now = timeSphere.now()
 * console.log(timeSphere.format(now)) // 2024-01-20 12:34:56
 *
 * // 日期解析和格式化
 * const date = timeSphere.parse('2024-01-20')
 * console.log(timeSphere.format(date, 'YYYY年MM月DD日')) // 2024年01月20日
 *
 * // 相对时间
 * const pastDate = timeSphere.decrement(now, 1, 'day')
 * console.log(timeSphere.fromNow(pastDate)) // 1天前
 *
 * // 日期比较
 * const baseDate = timeSphere.parse('2024-01-20')
 * const compareDate = timeSphere.parse('2024-01-21')
 * console.log(timeSphere.compare(baseDate, compareDate, 'day')) // -1 (早于)
 * ```
 *
 * @remarks
 * - 所有日期操作都是不可变的，不会修改原始日期对象
 * - 支持链式调用和方法组合
 * - 自动处理时区和国际化
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

/**
 * 日期时间服务实现
 * @remarks
 * 基于 dayjs 实现的日期时间处理服务，提供了完整的日期操作功能。
 * 使用策略模式实现了各种日期处理逻辑，支持自定义扩展。
 *
 * 主要功能：
 * - 日期解析和格式化
 * - 日期计算和比较
 * - 工作日处理
 * - 季度处理
 * - 周处理
 * - 国际化支持
 * - 时区处理
 *
 * 设计特点：
 * - 使用单例模式确保全局配置一致性
 * - 支持运行时动态配置
 * - 所有操作都是不可变的
 * - 自动处理时区和国际化
 *
 * @example
 * ```typescript
 * // 基本使用
 * const timeSphere = new TimeSphere()
 *
 * // 日期操作
 * const now = timeSphere.now()
 * const formatted = timeSphere.format(now)
 * const nextWeek = timeSphere.increment(now, 1, 'week')
 * ```
 */
@Singleton()
class TimeSphere implements TimeSphereImpl {
  /**
   * 服务配置
   * @remarks
   * 包含时区、语言、格式等配置项
   */
  private readonly options: TimeSphereOptions

  /**
   * 初始化服务配置和各种策略
   */
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
      timezone: 'Asia/Shanghai',
      locale: 'zh-cn',
      format: 'YYYY-MM-DD HH:mm:ss',
      utc: false
    }

    dayjs.locale(this.options.locale)
    dayjs.tz.setDefault(this.options.timezone)
  }

  /**
   * 动态更新服务配置，支持部分更新
   */
  updateOptions(options: Partial<TimeSphereOptions>) {
    Object.assign(this.options, options)

    if (this.options.locale) dayjs.locale(this.options.locale)
    if (this.options.timezone) dayjs.tz.setDefault(this.options.timezone)
  }

  /**
   * 获取当前时间
   * @remarks
   * 根据配置返回当前时间，支持 UTC 和本地时间
   */
  now(): Dayjs {
    return this.options.utc ? dayjs.utc() : dayjs()
  }

  /**
   * 解析日期
   * @remarks
   * 将各种格式的日期转换为 Dayjs 实例
   */
  parse(target?: ConfigType): Dayjs {
    const parsed = this.options.utc ? dayjs.utc(target) : dayjs(target)
    return parsed.clone().locale(this.options.locale ?? 'zh-cn')
  }

  /**
   * 格式化日期
   * @example
   * ```typescript
   * const timeSphere = new TimeSphere()
   *
   * // 基本格式化
   * timeSphere.format(new Date()) // => "2024-01-20 14:30:45"
   *
   * // 自定义格式
   * timeSphere.format(new Date(), 'YYYY年MM月DD日') // => "2024年01月20日"
   * timeSphere.format(new Date(), 'HH:mm') // => "14:30"
   *
   * // 常用格式示例
   * timeSphere.format(new Date(), 'YYYY-MM-DD') // => "2024-01-20"
   * timeSphere.format(new Date(), 'MM/DD/YYYY') // => "01/20/2024"
   * timeSphere.format(new Date(), 'DD/MM/YYYY') // => "20/01/2024"
   * timeSphere.format(new Date(), 'YYYY.MM.DD') // => "2024.01.20"
   * timeSphere.format(new Date(), 'ddd, MMM D YYYY') // => "Sat, Jan 20 2024"
   * timeSphere.format(new Date(), 'dddd, MMMM D YYYY') // => "Saturday, January 20 2024"
   * timeSphere.format(new Date(), 'YYYY年M月D日(ddd)') // => "2024年1月20日(周六)"
   *
   * // 时间格式
   * timeSphere.format(new Date(), 'HH:mm:ss') // => "14:30:45" (24小时制)
   * timeSphere.format(new Date(), 'hh:mm:ss A') // => "02:30:45 PM" (12小时制)
   * timeSphere.format(new Date(), 'H:m:s') // => "14:30:45" (不补零)
   *
   * // 毫秒和时区
   * timeSphere.format(new Date(), 'YYYY-MM-DD HH:mm:ss.SSS') // => "2024-01-20 14:30:45.123"
   * timeSphere.format(new Date(), 'YYYY-MM-DD HH:mm:ss Z') // => "2024-01-20 14:30:45 +08:00"
   *
   * // 季度和星期
   * timeSphere.format(new Date(), 'Qo季度 第W周') // => "1季度 第3周"
   * timeSphere.format(new Date(), 'YYYY年第Q季度') // => "2024年第1季度"
   * ```
   */
  format(datetime: ConfigType, format?: string): string {
    return this.parse(datetime).format(format)
  }

  /**
   * 获取相对时间
   * @remarks
   * 返回相对时间字符串，例如 "2小时前"
   */
  fromNow(datetime: ConfigType, withoutSuffix?: boolean): string {
    return this.parse(datetime).fromNow(withoutSuffix)
  }

  toTimestamp(datetime: ConfigType): number {
    return this.parse(datetime).valueOf()
  }

  /**
   * 验证日期是否有效
   */
  isValid(datetime: ConfigType): boolean {
    return this.parse(datetime).isValid()
  }

  /**
   * 比较两个日期
   * @remarks
   * 返回 -1(早于), 0(相等), 1(晚于)
   */
  compare(source: ConfigType, target: ConfigType, unit: UnitType): number {
    const base = this.parse(source)
    const compare = this.parse(target)
    if (base.isBefore(compare, unit)) return -1
    if (base.isAfter(compare, unit)) return 1
    return 0
  }

  /**
   * 添加时间
   */
  increment(datetime: ConfigType, amount: number, unit: UnitType): Dayjs {
    return this.parse(datetime).add(amount, unit)
  }

  /**
   * 减少时间
   */
  decrement(datetime: ConfigType, amount: number, unit: UnitType): Dayjs {
    return this.parse(datetime).subtract(amount, unit)
  }

  /**
   * 计算时间差
   */
  diff(source: ConfigType, target: ConfigType, unit: UnitType): number {
    return this.parse(source).diff(this.parse(target), unit)
  }

  /**
   * 判断日期是否在范围内
   */
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

  /**
   * 判断是否是今天
   */
  isToday(target: ConfigType): boolean {
    return this.parse(target).isToday()
  }

  /**
   * 判断是否是明天
   */
  isTomorrow(target: ConfigType): boolean {
    return this.parse(target).isTomorrow()
  }

  /**
   * 判断是否是昨天
   */
  isYesterday(target: ConfigType): boolean {
    return this.parse(target).isYesterday()
  }

  /**
   * 获取周数或周的时间范围
   * @remarks
   * type: ofYear(当年第几周), ofMonth(当月第几周), range/ranges/next(周范围)
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
        // 如果没有提供rangeEnd，默认使用当月最后一天
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

        // 获取季度内的所有月份
        while (current.isSameOrBefore(quarterEnd, 'month')) {
          months.push({
            date: current.format('YYYY-MM-DD'),
            month: current.month() + 1, // 1-12
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
        // 使用原生的 dayjs add quarter 支持
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
      number: () => parsed.month() + 1, // dayjs的month()返回0-11，这里返回1-12
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

        // 获取月份内的所有天
        const firstWeekday = monthStart.day() // 月初是星期几 (0=周日)
        while (current.isSameOrBefore(monthEnd, 'day')) {
          const dayOfMonth = current.date()
          // 修正weekOfMonth计算：考虑月初是星期几
          const offset = firstWeekday === 0 ? 6 : firstWeekday - 1 // 周一作为一周开始
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

        // 获取年份内的所有月份
        while (current.isSameOrBefore(yearEnd, 'month')) {
          months.push({
            date: current.format('YYYY-MM-DD'),
            month: current.month() + 1, // 1-12
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

export const timeSphere = new TimeSphere()
