/**
 * 日期时间工具
 * @description 基于 dayjs 的日期时间处理工具，支持全局配置、插件管理、国际化等特性。
 *
 * @example
 * ```typescript
 * // 1. 基本使用
 * const now = dateTimeService.now()
 * console.log(dateTimeService.format(now)) // 2024-01-20 12:34:56
 *
 * // 2. 日期解析和格式化
 * const date = dateTimeService.parse('2024-01-20')
 * console.log(dateTimeService.format(date, 'YYYY年MM月DD日')) // 2024年01月20日
 * console.log(dateTimeService.format(date, 'dddd')) // Saturday
 *
 * // 3. 相对时间
 * const pastDate = dateTimeService.subtract(now, 1, 'day')
 * console.log(dateTimeService.fromNow(pastDate)) // 1天前
 *
 * // 4. 日期比较
 * const baseDate = dateTimeService.parse('2024-01-20')
 * const compareDate = dateTimeService.parse('2024-01-21')
 * console.log(dateTimeService.compare(baseDate, compareDate)) // -1 (早于)
 *
 * // 5. 日期计算
 * const nextWeek = dateTimeService.add(now, 1, 'week')
 * const lastMonth = dateTimeService.subtract(now, 1, 'month')
 * const diffDays = dateTimeService.diff(nextWeek, lastMonth, 'day')
 *
 * // 6. 工作日处理
 * const isWorkday = dateTimeService.workday.isWorkday(now)
 * const nextWorkday = dateTimeService.workday.nextWorkday(now)
 * const workdays = dateTimeService.workday.countWorkdays(baseDate, compareDate)
 *
 * // 7. 日期信息获取
 * const dayInfo = {
 *   dayOfMonth: dateTimeService.date.getDayOfMonth(now), // 获取日期（1-31）
 *   dayOfYear: dateTimeService.date.getDayOfYear(now),   // 获取一年中的第几天（1-366）
 *   dayOfWeek: dateTimeService.date.getDayOfWeek(now, 'cn'), // 获取星期几（周一、周二...）
 *   weekOfMonth: dateTimeService.date.getWeekOfMonth(now),   // 获取本月第几周
 *   isWeekend: dateTimeService.date.isWeekend(now),         // 是否周末
 *   isToday: dateTimeService.date.isToday(now)              // 是否今天
 * }
 *
 * // 8. 季度处理
 * const quarterInfo = {
 *   current: dateTimeService.quarter.get(now),        // 获取当前季度（1-4）
 *   start: dateTimeService.quarter.startOf(now),      // 获取季度开始时间
 *   end: dateTimeService.quarter.endOf(now)           // 获取季度结束时间
 * }
 *
 * // 9. 周处理（自动适配中英文习惯）
 * const weekInfo = {
 *   weekNumber: dateTimeService.week.get(now),        // 获取当前周数（1-53）
 *   weekStart: dateTimeService.week.startOf(now),     // 获取周开始时间
 *   weekEnd: dateTimeService.week.endOf(now)          // 获取周结束时间
 * }
 *
 * // 10. 自定义工作日策略
 * class CustomWorkdayStrategy implements IWorkdayStrategy {
 *   private holidays: Set<string> = new Set(['2024-01-01', '2024-02-10'])
 *
 *   isWorkday(targetDate: ConfigType): boolean {
 *     const dateStr = dateTimeService.format(targetDate, 'YYYY-MM-DD')
 *     return !this.holidays.has(dateStr) && !dateTimeService.date.isWeekend(targetDate)
 *   }
 *
 *   nextWorkday(targetDate: ConfigType): Dayjs {
 *     let nextDate = dateTimeService.add(targetDate, 1, 'day')
 *     while (!this.isWorkday(nextDate)) {
 *       nextDate = dateTimeService.add(nextDate, 1, 'day')
 *     }
 *     return nextDate
 *   }
 *
 *   countWorkdays(startDate: ConfigType, endDate: ConfigType): number {
 *     let count = 0
 *     let currentDate = dateTimeService.parse(startDate)
 *     const lastDate = dateTimeService.parse(endDate)
 *
 *     while (currentDate.isBefore(lastDate) || currentDate.isSame(lastDate)) {
 *       if (this.isWorkday(currentDate)) count++
 *       currentDate = dateTimeService.add(currentDate, 1, 'day')
 *     }
 *     return count
 *   }
 * }
 *
 * // 11. 配置更新
 * await dateTimeService.updateConfig({
 *   timezone: 'America/New_York',    // 设置时区
 *   locale: 'en',                    // 设置语言
 *   format: 'MM/DD/YYYY HH:mm:ss',   // 设置默认格式
 *   utc: false,                      // 是否使用 UTC
 *   workdayStrategy: new CustomWorkdayStrategy() // 自定义工作日策略
 * })
 * ```
 *
 * @remarks
 * - 所有日期操作都是不可变的，不会修改原始日期对象
 * - 支持链式调用和方法组合
 * - 自动处理时区和国际化
 * - 支持自定义策略扩展
 *
 * @see {@link https://day.js.org/docs/en/installation/installation | Dayjs 官方文档}
 *
 * @packageDocumentation
 */

import dayjs, { type Dayjs, type ConfigType, type UnitType, type OpUnitType } from 'dayjs'
import { Singleton } from './singleton'

// 导入插件
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isBetween from 'dayjs/plugin/isBetween'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import dayOfYear from 'dayjs/plugin/dayOfYear'

// 导入语言包
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'

// 初始化插件
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.extend(customParseFormat)
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(isBetween)
dayjs.extend(quarterOfYear)
dayjs.extend(dayOfYear)

/**
 * 星期格式类型
 * @remarks
 * - number: 数字格式（1-7，周一到周日）
 * - cn: 中文简写（周一、周二...）
 * - cnLong: 中文全称（星期一、星期二...）
 * - en: 英文简写（Sun、Mon...）
 * - enLong: 英文全称（Sunday、Monday...）
 */
type WeekFormat = 'number' | 'cn' | 'cnLong' | 'en' | 'enLong'

/**
 * 星期映射表类型
 * @remarks
 * 定义了星期名称和索引转换的接口
 */
interface WeekMap {
  /** 星期名称数组 */
  names: readonly string[]
  /** 将 dayjs 的星期索引转换为目标格式的索引 */
  getIndex: (day: number) => number
}

/**
 * 星期映射表
 */
const weekMaps: Record<WeekFormat, WeekMap> = {
  // 中文从周一开始
  cn: {
    names: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    getIndex: (day: number): number => (day === 0 ? 6 : day - 1)
  },
  cnLong: {
    names: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
    getIndex: (day: number): number => (day === 0 ? 6 : day - 1)
  },
  // 英文从周日开始
  en: {
    names: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    getIndex: (day: number): number => day
  },
  enLong: {
    names: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    getIndex: (day: number): number => day
  },
  // 数字格式（1-7，周一到周日）
  number: {
    names: ['1', '2', '3', '4', '5', '6', '7'],
    getIndex: (day: number): number => (day === 0 ? 6 : day - 1)
  }
} as const

/**
 * 日期格式化策略接口
 * @remarks
 * 定义了日期格式化的标准接口，可以实现自定义的格式化逻辑
 */
interface IDateFormatStrategy {
  /**
   * 格式化日期
   * @param targetDate - 要格式化的日期
   * @param format - 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
   * @returns 格式化后的字符串
   */
  format(targetDate: ConfigType, format?: string): string
}

/**
 * 默认日期格式化策略
 */
class DefaultDateFormatStrategy implements IDateFormatStrategy {
  format(date: ConfigType, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    return dayjs(date).format(format)
  }
}

/**
 * 日期计算策略接口
 * @remarks
 * 定义了日期计算的标准接口，包括添加、减少和计算差值
 */
interface IDateCalculationStrategy {
  /**
   * 添加时间
   * @param targetDate - 目标日期
   * @param amount - 要添加的数量
   * @param unit - 时间单位（年、月、日、时、分、秒等）
   * @returns 新的日期对象
   */
  add(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs

  /**
   * 减少时间
   * @param targetDate - 目标日期
   * @param amount - 要减少的数量
   * @param unit - 时间单位（年、月、日、时、分、秒等）
   * @returns 新的日期对象
   */
  subtract(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs

  /**
   * 计算时间差
   * @param baseDate - 基准日期
   * @param compareDate - 比较日期
   * @param unit - 时间单位（年、月、日、时、分、秒等）
   * @returns 时间差值
   */
  diff(baseDate: ConfigType, compareDate: ConfigType, unit: UnitType): number
}

/**
 * 默认日期计算策略
 */
class DefaultDateCalculationStrategy implements IDateCalculationStrategy {
  add(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs {
    return dayjs(targetDate).add(amount, unit)
  }

  subtract(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs {
    return dayjs(targetDate).subtract(amount, unit)
  }

  diff(baseDate: ConfigType, compareDate: ConfigType, unit: UnitType): number {
    return dayjs(baseDate).diff(dayjs(compareDate), unit)
  }
}

/**
 * 工作日计算策略接口
 * @remarks
 * 定义了工作日相关的标准接口，可以实现自定义的工作日判断逻辑
 * 例如处理法定节假日、调休等特殊情况
 */
interface IWorkdayStrategy {
  /**
   * 判断是否是工作日
   * @param targetDate - 要判断的日期
   * @returns 是否是工作日
   */
  isWorkday(targetDate: ConfigType): boolean

  /**
   * 获取下一个工作日
   * @param targetDate - 基准日期
   * @returns 下一个工作日
   */
  nextWorkday(targetDate: ConfigType): Dayjs

  /**
   * 计算工作日天数
   * @param startDate - 开始日期
   * @param endDate - 结束日期
   * @returns 工作日天数
   */
  countWorkdays(startDate: ConfigType, endDate: ConfigType): number
}

/**
 * 默认工作日计算策略（周一至周五）
 */
class DefaultWorkdayStrategy implements IWorkdayStrategy {
  isWorkday(targetDate: ConfigType): boolean {
    const day = dayjs(targetDate).day()
    return day !== 0 && day !== 6
  }

  nextWorkday(targetDate: ConfigType): Dayjs {
    let nextDate = dayjs(targetDate).add(1, 'day')
    while (!this.isWorkday(nextDate)) {
      nextDate = nextDate.add(1, 'day')
    }
    return nextDate
  }

  countWorkdays(startDate: ConfigType, endDate: ConfigType): number {
    let count = 0
    let currentDate = dayjs(startDate)
    const lastDate = dayjs(endDate)

    while (currentDate.isBefore(lastDate) || currentDate.isSame(lastDate)) {
      if (this.isWorkday(currentDate)) {
        count++
      }
      currentDate = currentDate.add(1, 'day')
    }

    return count
  }
}

/**
 * 星期格式化策略接口
 */
interface IWeekFormatStrategy {
  format(day: number, format: WeekFormat): string | number
}

/**
 * 默认星期格式化策略
 */
class DefaultWeekFormatStrategy implements IWeekFormatStrategy {
  format(day: number, format: WeekFormat): string | number {
    if (format === 'number') {
      return day === 0 ? 7 : day
    }

    const map = weekMaps[format]
    const index = map.getIndex(day)
    return map.names[index]
  }
}

/**
 * 日期时间配置选项
 * @remarks
 * 支持运行时动态配置，所有选项都是可选的
 */
interface DateTimeConfig extends Record<string, unknown> {
  /** 默认时区，例如 'Asia/Shanghai'，'America/New_York' 等 */
  timezone?: string
  /** 默认语言，支持 'zh-cn'（中文）和 'en'（英文）*/
  locale?: string
  /** 默认日期格式，使用 dayjs 的格式字符串，例如 'YYYY-MM-DD HH:mm:ss' */
  format?: string
  /** 是否使用 UTC 时间，true 表示使用 UTC，false 表示使用本地时间 */
  utc?: boolean
  /** 日期格式化策略，用于自定义日期格式化逻辑 */
  formatStrategy?: IDateFormatStrategy
  /** 日期计算策略，用于自定义日期计算逻辑 */
  calculationStrategy?: IDateCalculationStrategy
  /** 工作日计算策略，用于自定义工作日判断和计算逻辑 */
  workdayStrategy?: IWorkdayStrategy
  /** 星期格式化策略，用于自定义星期格式化逻辑 */
  weekFormatStrategy?: IWeekFormatStrategy
}

/**
 * 初始化插件
 */
function initializePlugins(): void {
  dayjs.extend(utc)
  dayjs.extend(timezone)
  dayjs.extend(relativeTime)
  dayjs.extend(duration)
  dayjs.extend(customParseFormat)
  dayjs.extend(weekOfYear)
  dayjs.extend(isSameOrBefore)
  dayjs.extend(isSameOrAfter)
  dayjs.extend(isBetween)
  dayjs.extend(quarterOfYear)
  dayjs.extend(dayOfYear)
}

// 初始化插件
initializePlugins()

/**
 * 日期相关操作接口
 * @remarks
 * 定义了日期常用操作的标准接口，包括获取日期信息和判断日期状态
 */
interface IDateOperations {
  /**
   * 获取日期是当月的第几天
   * @param targetDate - 目标日期
   * @returns 当月第几天（1-31）
   */
  getDayOfMonth: (targetDate: ConfigType) => number

  /**
   * 获取日期是当年的第几天
   * @param targetDate - 目标日期
   * @returns 当年第几天（1-366）
   */
  getDayOfYear: (targetDate: ConfigType) => number

  /**
   * 获取星期几
   * @param targetDate - 目标日期
   * @param format - 返回格式，支持数字、中文、英文等多种格式
   * @returns 星期几的表示
   */
  getDayOfWeek: (targetDate: ConfigType, format?: WeekFormat) => string | number

  /**
   * 获取日期是当月的第几周
   * @param targetDate - 目标日期
   * @returns 当月第几周（1-6）
   */
  getWeekOfMonth: (targetDate: ConfigType) => number

  /**
   * 判断是否是周末
   * @param targetDate - 目标日期
   * @returns 是否是周末
   */
  isWeekend: (targetDate: ConfigType) => boolean

  /**
   * 判断是否是今天
   * @param targetDate - 目标日期
   * @returns 是否是今天
   */
  isToday: (targetDate: ConfigType) => boolean

  /**
   * 获取日期的开始时间（00:00:00）
   * @param targetDate - 目标日期
   * @returns 日期开始时间
   */
  startOfDay: (targetDate: ConfigType) => Dayjs

  /**
   * 获取日期的结束时间（23:59:59）
   * @param targetDate - 目标日期
   * @returns 日期结束时间
   */
  endOfDay: (targetDate: ConfigType) => Dayjs
}

/**
 * 日期时间服务接口
 * @remarks
 * 定义了完整的日期时间处理功能，包括：
 * - 基础日期操作（解析、格式化、验证）
 * - 日期计算（加减、比较、范围判断）
 * - 工作日处理
 * - 季度处理
 * - 周处理
 * - 国际化支持
 * - 时区处理
 */
interface IDateTimeService {
  /**
   * 初始化服务
   * @remarks
   * 加载配置和插件，设置默认选项。
   */
  init(): Promise<void>

  /**
   * 更新配置
   * @param config - 新的配置选项
   */
  updateConfig(config: Partial<DateTimeConfig>): Promise<void>

  /**
   * 获取当前时间
   * @returns Dayjs 实例
   */
  now(): Dayjs

  /**
   * 解析日期
   * @param date - 要解析的日期
   * @returns Dayjs 实例
   */
  parse(date?: ConfigType): Dayjs

  /**
   * 格式化日期
   * @param date - 要格式化的日期
   * @param format - 格式化模板
   * @returns 格式化后的字符串
   * @example
   * ```typescript
   * const service = new DateTimeService()
   *
   * // 基本格式化
   * service.format(new Date()) // => "2024-01-20 14:30:45"
   *
   * // 自定义格式
   * service.format(new Date(), 'YYYY年MM月DD日') // => "2024年01月20日"
   * service.format(new Date(), 'HH:mm') // => "14:30"
   *
   * // 常用格式示例
   * service.format(new Date(), 'YYYY-MM-DD') // => "2024-01-20"
   * service.format(new Date(), 'MM/DD/YYYY') // => "01/20/2024"
   * service.format(new Date(), 'DD/MM/YYYY') // => "20/01/2024"
   * service.format(new Date(), 'YYYY.MM.DD') // => "2024.01.20"
   * service.format(new Date(), 'ddd, MMM D YYYY') // => "Sat, Jan 20 2024"
   * service.format(new Date(), 'dddd, MMMM D YYYY') // => "Saturday, January 20 2024"
   * service.format(new Date(), 'YYYY年M月D日(ddd)') // => "2024年1月20日(周六)"
   *
   * // 时间格式
   * service.format(new Date(), 'HH:mm:ss') // => "14:30:45" (24小时制)
   * service.format(new Date(), 'hh:mm:ss A') // => "02:30:45 PM" (12小时制)
   * service.format(new Date(), 'H:m:s') // => "14:30:45" (不补零)
   *
   * // 毫秒和时区
   * service.format(new Date(), 'YYYY-MM-DD HH:mm:ss.SSS') // => "2024-01-20 14:30:45.123"
   * service.format(new Date(), 'YYYY-MM-DD HH:mm:ss Z') // => "2024-01-20 14:30:45 +08:00"
   *
   * // 季度和星期
   * service.format(new Date(), 'Qo季度 第W周') // => "1季度 第3周"
   * service.format(new Date(), 'YYYY年第Q季度') // => "2024年第1季度"
   * ```
   */
  format(date: ConfigType, format?: string): string

  /**
   * 获取相对时间
   * @param date - 要比较的日期
   * @returns 相对时间字符串，例如 "2小时前"
   */
  fromNow(date: ConfigType): string

  /**
   * 验证日期是否有效
   * @param date - 要验证的日期
   * @returns 是否有效
   */
  isValid(date: ConfigType): boolean

  /**
   * 比较两个日期
   * @param baseDate - 基准日期
   * @param compareDate - 比较日期
   * @returns -1(早于), 0(相等), 1(晚于)
   */
  compare(baseDate: ConfigType, compareDate: ConfigType): number

  /**
   * 添加时间
   * @param targetDate - 目标日期
   * @param amount - 增加的数量
   * @param unit - 时间单位
   * @returns Dayjs 实例
   */
  add(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs

  /**
   * 减少时间
   * @param targetDate - 目标日期
   * @param amount - 减少的数量
   * @param unit - 时间单位
   * @returns Dayjs 实例
   */
  subtract(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs

  /**
   * 计算时间差
   * @param baseDate - 基准日期
   * @param compareDate - 比较日期
   * @param unit - 时间单位
   * @returns 时间差
   */
  diff(baseDate: ConfigType, compareDate: ConfigType, unit: UnitType): number

  /**
   * 判断日期是否在范围内
   * @param targetDate - 目标日期
   * @param rangeStart - 范围开始日期
   * @param rangeEnd - 范围结束日期
   * @param unit - 时间单位
   * @returns 是否在范围内
   */
  isBetween(
    targetDate: ConfigType,
    rangeStart: ConfigType,
    rangeEnd: ConfigType,
    unit?: OpUnitType
  ): boolean

  /**
   * 工作日相关操作
   */
  workday: {
    /**
     * 判断是否是工作日
     * @param targetDate - 要检查的日期
     * @returns 是否是工作日
     */
    isWorkday(targetDate: ConfigType): boolean

    /**
     * 获取下一个工作日
     * @param targetDate - 基准日期
     * @returns 下一个工作日
     */
    nextWorkday(targetDate: ConfigType): Dayjs

    /**
     * 计算工作日天数
     * @param startDate - 开始日期
     * @param endDate - 结束日期
     * @returns 工作日天数
     */
    countWorkdays(startDate: ConfigType, endDate: ConfigType): number
  }

  /**
   * 季度相关操作
   */
  quarter: {
    /**
     * 获取季度数
     * @param targetDate - 日期
     * @returns 季度数（1-4）
     */
    get(targetDate: ConfigType): number

    /**
     * 获取季度开始时间
     * @param targetDate - 日期
     * @returns 季度开始时间
     */
    startOf(targetDate: ConfigType): Dayjs

    /**
     * 获取季度结束时间
     * @param targetDate - 日期
     * @returns 季度结束时间
     */
    endOf(targetDate: ConfigType): Dayjs
  }

  /**
   * 周相关操作
   */
  week: {
    /**
     * 获取周数
     * @param targetDate - 日期
     * @returns 周数（1-53）
     */
    get(targetDate: ConfigType): number

    /**
     * 获取周开始时间（根据语言环境自动调整）
     * @param targetDate - 日期
     * @returns 周开始时间
     */
    startOf(targetDate: ConfigType): Dayjs

    /**
     * 获取周结束时间（根据语言环境自动调整）
     * @param targetDate - 日期
     * @returns 周结束时间
     */
    endOf(targetDate: ConfigType): Dayjs
  }

  /**
   * 日期相关操作
   */
  date: IDateOperations
}

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
 * - 使用策略模式支持自定义扩展
 * - 使用单例模式确保全局配置一致性
 * - 支持运行时动态配置
 * - 所有操作都是不可变的
 * - 自动处理时区和国际化
 *
 * @example
 * ```typescript
 * // 基本使用
 * const service = new DateTimeService()
 *
 * // 自定义工作日策略
 * service.updateConfig({
 *   workdayStrategy: new CustomWorkdayStrategy()
 * })
 *
 * // 日期操作
 * const now = service.now()
 * const formatted = service.format(now)
 * const nextWeek = service.add(now, 1, 'week')
 * ```
 */
@Singleton({
  global: true,
  onCreate(instance) {
    instance.init()
  }
})
class DateTimeService implements IDateTimeService {
  /**
   * 服务配置
   * @remarks
   * 包含时区、语言、格式等配置项
   * @private
   */
  private readonly config: DateTimeConfig

  /**
   * 日期格式化策略
   * @remarks
   * 负责日期的格式化逻辑
   * @private
   */
  private readonly formatStrategy: IDateFormatStrategy

  /**
   * 日期计算策略
   * @remarks
   * 负责日期的计算逻辑
   * @private
   */
  private readonly calculationStrategy: IDateCalculationStrategy

  /**
   * 工作日计算策略
   * @remarks
   * 负责工作日的判断和计算逻辑
   * @private
   */
  private readonly workdayStrategy: IWorkdayStrategy

  /**
   * 星期格式化策略
   * @remarks
   * 负责星期的格式化逻辑
   * @private
   */
  private readonly weekFormatStrategy: IWeekFormatStrategy

  /**
   * 构造函数
   * @remarks
   * 初始化服务配置和各种策略
   */
  constructor() {
    this.config = {
      timezone: 'Asia/Shanghai',
      locale: 'zh-cn',
      format: 'YYYY-MM-DD HH:mm:ss',
      utc: false
    }
    this.formatStrategy = new DefaultDateFormatStrategy()
    this.calculationStrategy = new DefaultDateCalculationStrategy()
    this.workdayStrategy = new DefaultWorkdayStrategy()
    this.weekFormatStrategy = new DefaultWeekFormatStrategy()
  }

  /**
   * 初始化服务
   * @remarks
   * 加载配置和插件，设置默认选项
   * @returns Promise<void>
   * @throws 如果初始化失败
   */
  async init(): Promise<void> {
    try {
      if (this.config.locale) {
        dayjs.locale(this.config.locale)
      }
      if (this.config.timezone) {
        dayjs.tz.setDefault(this.config.timezone)
      }
    } catch (error) {
      console.warn('Failed to initialize DateTimeService:', error)
    }
  }

  /**
   * 更新配置
   * @remarks
   * 动态更新服务配置，支持部分更新
   * @param config - 新的配置选项
   * @returns Promise<void>
   */
  async updateConfig(config: Partial<DateTimeConfig>): Promise<void> {
    Object.assign(this.config, config)
    await this.init()
  }

  /**
   * 获取当前时间
   * @remarks
   * 根据配置返回当前时间，支持 UTC 和本地时间
   * @returns Dayjs 实例
   */
  now(): Dayjs {
    return this.config.utc ? dayjs.utc() : dayjs()
  }

  /**
   * 解析日期
   * @remarks
   * 将各种格式的日期转换为 Dayjs 实例
   * @param targetDate - 要解析的日期
   * @returns Dayjs 实例
   */
  parse(targetDate?: ConfigType): Dayjs {
    return this.config.utc ? dayjs.utc(targetDate) : dayjs(targetDate)
  }

  /**
   * 格式化日期
   * @param date - 要格式化的日期
   * @param format - 格式化模板
   * @returns 格式化后的字符串
   * @example
   * ```typescript
   * const service = new DateTimeService()
   *
   * // 基本格式化
   * service.format(new Date()) // => "2024-01-20 14:30:45"
   *
   * // 自定义格式
   * service.format(new Date(), 'YYYY年MM月DD日') // => "2024年01月20日"
   * service.format(new Date(), 'HH:mm') // => "14:30"
   *
   * // 常用格式示例
   * service.format(new Date(), 'YYYY-MM-DD') // => "2024-01-20"
   * service.format(new Date(), 'MM/DD/YYYY') // => "01/20/2024"
   * service.format(new Date(), 'DD/MM/YYYY') // => "20/01/2024"
   * service.format(new Date(), 'YYYY.MM.DD') // => "2024.01.20"
   * service.format(new Date(), 'ddd, MMM D YYYY') // => "Sat, Jan 20 2024"
   * service.format(new Date(), 'dddd, MMMM D YYYY') // => "Saturday, January 20 2024"
   * service.format(new Date(), 'YYYY年M月D日(ddd)') // => "2024年1月20日(周六)"
   *
   * // 时间格式
   * service.format(new Date(), 'HH:mm:ss') // => "14:30:45" (24小时制)
   * service.format(new Date(), 'hh:mm:ss A') // => "02:30:45 PM" (12小时制)
   * service.format(new Date(), 'H:m:s') // => "14:30:45" (不补零)
   *
   * // 毫秒和时区
   * service.format(new Date(), 'YYYY-MM-DD HH:mm:ss.SSS') // => "2024-01-20 14:30:45.123"
   * service.format(new Date(), 'YYYY-MM-DD HH:mm:ss Z') // => "2024-01-20 14:30:45 +08:00"
   *
   * // 季度和星期
   * service.format(new Date(), 'Qo季度 第W周') // => "1季度 第3周"
   * service.format(new Date(), 'YYYY年第Q季度') // => "2024年第1季度"
   * ```
   */
  format(date: ConfigType, format?: string): string {
    return this.formatStrategy.format(date, format || this.config.format)
  }

  /**
   * 获取相对时间
   * @param date - 要比较的日期
   * @returns 相对时间字符串，例如 "2小时前"
   */
  fromNow(date: ConfigType): string {
    return this.parse(date).fromNow()
  }

  /**
   * 验证日期是否有效
   * @param date - 要验证的日期
   * @returns 是否有效
   */
  isValid(date: ConfigType): boolean {
    return this.parse(date).isValid()
  }

  /**
   * 比较两个日期
   * @param baseDate - 基准日期
   * @param compareDate - 比较日期
   * @returns -1(早于), 0(相等), 1(晚于)
   */
  compare(baseDate: ConfigType, compareDate: ConfigType): number {
    const base = this.parse(baseDate)
    const compare = this.parse(compareDate)
    if (base.isBefore(compare)) return -1
    if (base.isAfter(compare)) return 1
    return 0
  }

  /**
   * 添加时间
   * @param targetDate - 目标日期
   * @param amount - 增加的数量
   * @param unit - 时间单位
   * @returns Dayjs 实例
   */
  add(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs {
    return this.calculationStrategy.add(targetDate, amount, unit)
  }

  /**
   * 减少时间
   * @param targetDate - 目标日期
   * @param amount - 减少的数量
   * @param unit - 时间单位
   * @returns Dayjs 实例
   */
  subtract(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs {
    return this.calculationStrategy.subtract(targetDate, amount, unit)
  }

  /**
   * 计算时间差
   * @param baseDate - 基准日期
   * @param compareDate - 比较日期
   * @param unit - 时间单位
   * @returns 时间差
   */
  diff(baseDate: ConfigType, compareDate: ConfigType, unit: UnitType): number {
    return this.calculationStrategy.diff(baseDate, compareDate, unit)
  }

  /**
   * 判断日期是否在范围内
   * @param targetDate - 目标日期
   * @param rangeStart - 范围开始日期
   * @param rangeEnd - 范围结束日期
   * @param unit - 时间单位
   * @returns 是否在范围内
   */
  isBetween(
    targetDate: ConfigType,
    rangeStart: ConfigType,
    rangeEnd: ConfigType,
    unit?: OpUnitType
  ): boolean {
    return this.parse(targetDate).isBetween(this.parse(rangeStart), this.parse(rangeEnd), unit)
  }

  /**
   * 工作日相关操作
   * @remarks
   * 提供工作日的判断、计算等功能
   * 可以通过自定义策略处理节假日等特殊情况
   * @example
   * ```typescript
   * const service = new DateTimeService()
   *
   * // 1. 基本工作日判断
   * service.workday.isWorkday('2024-01-20') // => false (周六)
   * service.workday.isWorkday('2024-01-22') // => true (周一)
   *
   * // 2. 获取下一个工作日
   * service.workday.nextWorkday('2024-01-19') // => 2024-01-22 (周五的下一个工作日是下周一)
   * service.workday.nextWorkday('2024-01-20') // => 2024-01-22 (周六的下一个工作日是下周一)
   *
   * // 3. 计算工作日天数
   * service.workday.countWorkdays('2024-01-01', '2024-01-31') // => 23 (1月份的工作日数)
   * service.workday.countWorkdays('2024-01-01', '2024-01-07') // => 5 (第一周的工作日数)
   *
   * // 4. 自定义工作日策略（处理节假日）
   * class CustomWorkdayStrategy implements IWorkdayStrategy {
   *   private holidays: Set<string> = new Set(['2024-01-01', '2024-02-10']) // 法定节假日
   *   private workdays: Set<string> = new Set(['2024-02-04']) // 调休工作日
   *
   *   isWorkday(targetDate: ConfigType): boolean {
   *     const dateStr = service.format(targetDate, 'YYYY-MM-DD')
   *     // 优先判断特殊情况
   *     if (this.holidays.has(dateStr)) return false
   *     if (this.workdays.has(dateStr)) return true
   *     // 普通情况判断周末
   *     return !service.date.isWeekend(targetDate)
   *   }
   *
   *   // ... 其他方法实现 ...
   * }
   *
   * // 5. 应用自定义策略
   * await service.updateConfig({
   *   workdayStrategy: new CustomWorkdayStrategy()
   * })
   *
   * // 使用自定义策略判断
   * service.workday.isWorkday('2024-01-01') // => false (元旦节假日)
   * service.workday.isWorkday('2024-02-04') // => true (调休工作日)
   * ```
   */
  workday = {
    isWorkday: (targetDate: ConfigType): boolean => {
      return this.workdayStrategy.isWorkday(targetDate)
    },

    nextWorkday: (targetDate: ConfigType): Dayjs => {
      return this.workdayStrategy.nextWorkday(targetDate)
    },

    countWorkdays: (startDate: ConfigType, endDate: ConfigType): number => {
      return this.workdayStrategy.countWorkdays(startDate, endDate)
    }
  }

  /**
   * 日期相关操作
   * @remarks
   * 提供日期的各种信息获取和状态判断功能
   * @example
   * ```typescript
   * const service = new DateTimeService()
   *
   * // 1. 获取日期信息
   * const date = '2024-01-20'
   *
   * // 日期数值
   * service.date.getDayOfMonth(date) // => 20 (一个月中的第20天)
   * service.date.getDayOfYear(date) // => 20 (一年中的第20天)
   *
   * // 2. 获取星期几（多种格式）
   * // 数字格式（1-7，周一到周日）
   * service.date.getDayOfWeek(date, 'number') // => 6
   *
   * // 中文格式
   * service.date.getDayOfWeek(date, 'cn') // => "周六"
   * service.date.getDayOfWeek(date, 'cnLong') // => "星期六"
   *
   * // 英文格式
   * service.date.getDayOfWeek(date, 'en') // => "Sat"
   * service.date.getDayOfWeek(date, 'enLong') // => "Saturday"
   *
   * // 3. 获取是当月第几周
   * service.date.getWeekOfMonth(date) // => 3 (第三周)
   *
   * // 4. 周末判断
   * service.date.isWeekend('2024-01-20') // => true (周六)
   * service.date.isWeekend('2024-01-22') // => false (周一)
   *
   * // 5. 今天判断
   * service.date.isToday(new Date()) // => true
   * service.date.isToday('2024-01-01') // => false
   *
   * // 6. 获取日期的开始和结束时间
   * service.date.startOfDay(date) // => 2024-01-20 00:00:00
   * service.date.endOfDay(date) // => 2024-01-20 23:59:59
   *
   * // 7. 组合使用示例
   * const now = service.now()
   * const isWeekendToday = service.date.isWeekend(now) && service.date.isToday(now)
   * const todayStart = service.date.startOfDay(now)
   * const weekNumber = service.date.getWeekOfMonth(now)
   * const weekdayName = service.date.getDayOfWeek(now, 'cnLong')
   *
   * // 8. 日期范围处理
   * const start = service.date.startOfDay('2024-01-20')
   * const end = service.date.endOfDay('2024-01-20')
   * const isInRange = (date: Date) => {
   *   return service.isBetween(date, start, end)
   * }
   * ```
   */
  date: IDateOperations = {
    getDayOfMonth: (targetDate: ConfigType): number => this.parse(targetDate).date(),
    getDayOfYear: (targetDate: ConfigType): number => this.parse(targetDate).dayOfYear(),
    getDayOfWeek: (targetDate: ConfigType, format: WeekFormat = 'number'): string | number => {
      const parsedDate = this.parse(targetDate)
      return this.weekFormatStrategy.format(parsedDate.day(), format)
    },
    getWeekOfMonth: (targetDate: ConfigType): number => {
      const parsedDate = this.parse(targetDate)
      const monthStart = parsedDate.startOf('month')
      const firstWeekday = monthStart.day()
      const dayOfMonth = parsedDate.date()
      const offset = firstWeekday === 0 ? 6 : firstWeekday - 1
      return Math.ceil((dayOfMonth + offset) / 7)
    },
    isWeekend: (targetDate: ConfigType): boolean => {
      const weekendDays = new Set([0, 6])
      return weekendDays.has(this.parse(targetDate).day())
    },
    isToday: (targetDate: ConfigType): boolean => this.parse(targetDate).isSame(this.now(), 'day'),
    startOfDay: (targetDate: ConfigType): Dayjs => this.parse(targetDate).startOf('day'),
    endOfDay: (targetDate: ConfigType): Dayjs => this.parse(targetDate).endOf('day')
  }

  /**
   * 季度相关操作
   * @remarks
   * 提供季度的信息获取和范围计算功能
   * @example
   * ```typescript
   * const service = new DateTimeService()
   *
   * // 1. 获取季度
   * service.quarter.get('2024-01-20') // => 1 (第一季度)
   * service.quarter.get('2024-04-01') // => 2 (第二季度)
   * service.quarter.get('2024-07-01') // => 3 (第三季度)
   * service.quarter.get('2024-10-01') // => 4 (第四季度)
   *
   * // 2. 获取季度的开始时间
   * service.quarter.startOf('2024-01-20') // => 2024-01-01 00:00:00
   * service.quarter.startOf('2024-04-01') // => 2024-04-01 00:00:00
   * service.quarter.startOf('2024-07-01') // => 2024-07-01 00:00:00
   * service.quarter.startOf('2024-10-01') // => 2024-10-01 00:00:00
   *
   * // 3. 获取季度的结束时间
   * service.quarter.endOf('2024-01-20') // => 2024-03-31 23:59:59
   * service.quarter.endOf('2024-04-01') // => 2024-06-30 23:59:59
   * service.quarter.endOf('2024-07-01') // => 2024-09-30 23:59:59
   * service.quarter.endOf('2024-10-01') // => 2024-12-31 23:59:59
   *
   * // 4. 季度范围处理示例
   * const date = '2024-01-20'
   * const quarterStart = service.quarter.startOf(date)
   * const quarterEnd = service.quarter.endOf(date)
   *
   * // 判断日期是否在当前季度
   * const isInCurrentQuarter = (targetDate: Date) => {
   *   return service.isBetween(targetDate, quarterStart, quarterEnd)
   * }
   *
   * // 获取季度的所有月份
   * const getQuarterMonths = (date: string) => {
   *   const quarter = service.quarter.get(date)
   *   const startMonth = (quarter - 1) * 3 + 1
   *   return Array.from({ length: 3 }, (_, i) => startMonth + i)
   * }
   * ```
   */
  quarter = {
    get: (targetDate: ConfigType): number => {
      return this.parse(targetDate).quarter()
    },

    startOf: (targetDate: ConfigType): Dayjs => {
      return this.parse(targetDate).startOf('quarter')
    },

    endOf: (targetDate: ConfigType): Dayjs => {
      return this.parse(targetDate).endOf('quarter')
    }
  }

  /**
   * 周相关操作
   * @remarks
   * 提供周的信息获取和范围计算功能
   * 自动根据语言环境调整周的起始日
   * @example
   * ```typescript
   * const service = new DateTimeService()
   *
   * // 1. 获取周数
   * service.week.get('2024-01-20') // => 3 (第三周)
   *
   * // 2. 中文环境（周一为起始日）
   * await service.updateConfig({ locale: 'zh-cn' })
   *
   * // 获取周的开始和结束
   * service.week.startOf('2024-01-20') // => 2024-01-15 00:00:00 (周一)
   * service.week.endOf('2024-01-20') // => 2024-01-21 23:59:59 (周日)
   *
   * // 3. 英文环境（周日为起始日）
   * await service.updateConfig({ locale: 'en' })
   *
   * // 获取周的开始和结束
   * service.week.startOf('2024-01-20') // => 2024-01-14 00:00:00 (周日)
   * service.week.endOf('2024-01-20') // => 2024-01-20 23:59:59 (周六)
   *
   * // 4. 实用示例
   *
   * // 获取本周所有日期
   * const getWeekDates = (date: string) => {
   *   const start = service.week.startOf(date)
   *   return Array.from({ length: 7 }, (_, i) => {
   *     return service.add(start, i, 'day')
   *   })
   * }
   *
   * // 判断是否是同一周
   * const isSameWeek = (date1: string, date2: string) => {
   *   const start = service.week.startOf(date1)
   *   const end = service.week.endOf(date1)
   *   return service.isBetween(date2, start, end)
   * }
   *
   * // 获取本周工作日
   * const getWeekWorkdays = (date: string) => {
   *   return getWeekDates(date).filter(d => !service.date.isWeekend(d))
   * }
   * ```
   */
  week = {
    get: (targetDate: ConfigType): number => {
      return this.parse(targetDate).week()
    },

    startOf: (targetDate: ConfigType): Dayjs => {
      const parsedDate = this.parse(targetDate)
      const isChineseLocale = this.config.locale?.startsWith('zh')
      return parsedDate.locale(isChineseLocale ? 'zh-cn' : 'en').startOf('week')
    },

    endOf: (targetDate: ConfigType): Dayjs => {
      const parsedDate = this.parse(targetDate)
      const isChineseLocale = this.config.locale?.startsWith('zh')
      return parsedDate.locale(isChineseLocale ? 'zh-cn' : 'en').endOf('week')
    }
  }
}

// 创建单例实例
const dateTimeService = new DateTimeService()

// 导出类型和接口
export type {
  IWorkdayStrategy,
  IDateFormatStrategy,
  IDateCalculationStrategy,
  IDateOperations,
  DateTimeConfig,
  WeekFormat,
  IDateTimeService
}

// 导出类和实例
export {
  dateTimeService,
  DateTimeService,
  DefaultWorkdayStrategy,
  DefaultDateFormatStrategy,
  DefaultDateCalculationStrategy,
  DefaultWeekFormatStrategy
}
