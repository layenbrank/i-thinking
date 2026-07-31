import type { ConfigType, Dayjs, OpUnitType, UnitType } from 'dayjs'

/**
 * 日期时间配置选项
 * @remarks
 * 支持运行时动态配置，所有选项都是可选的
 */
export interface TimeSphereOptions {
  timezone?: string
  locale?: string
  format?: string
  utc?: boolean
}

export interface DayInfo {
  date: string
  day: string
  month: string
  year: string
  dayOfWeek: string
  dayOfWeekShort?: string
  isToday?: boolean
  dayOfYear?: number
  dayOfMonth?: number
  isWeekend?: boolean
  weekOfMonth?: number
}

export interface DayRange {
  begin: DayInfo
  final: DayInfo
}

export interface QuarterInfo {
  date: string
  quarter: number
  month: string
  year: string
}

export interface QuarterRange {
  begin: QuarterInfo
  final: QuarterInfo
}

export interface MonthInfo {
  date: string
  month: number
  monthName: string
  monthShort?: string
  year: number
  quarter?: number
  daysInMonth: number
}

export interface MonthRange {
  begin: {
    date: string
    month: number
    monthName: string
    year: string
  }
  final: {
    date: string
    month: number
    monthName: string
    year: string
  }
  daysInMonth: number
}

export interface YearRange {
  begin: {
    date: string
    year: number
  }
  final: {
    date: string
    year: number
  }
  isLeapYear: boolean
  daysInYear: number
}

export interface NextQuarterInfo {
  begin: string
  final: string
  quarter: number
  year: number
}

export type DayType = 'ofYear' | 'ofMonth' | 'begin' | 'final' | 'range' | 'ranges'
export type QuarterType = 'number' | 'begin' | 'final' | 'range' | 'ranges' | 'next'
export type MonthType = 'number' | 'begin' | 'final' | 'range' | 'ranges'
export type YearType = 'number' | 'begin' | 'final' | 'range' | 'ranges'

export type DayReturnType<T extends DayType> = T extends 'ofYear' | 'ofMonth'
  ? number
  : T extends 'begin' | 'final'
    ? Dayjs
    : T extends 'range'
      ? DayRange
      : T extends 'ranges'
        ? DayInfo[]
        : never

export type QuarterReturnType<T extends QuarterType> = T extends 'number'
  ? number
  : T extends 'begin' | 'final'
    ? Dayjs
    : T extends 'range'
      ? QuarterRange
      : T extends 'ranges'
        ? MonthInfo[]
        : T extends 'next'
          ? NextQuarterInfo
          : never

export type MonthReturnType<T extends MonthType> = T extends 'number'
  ? number
  : T extends 'begin' | 'final'
    ? Dayjs
    : T extends 'range'
      ? MonthRange
      : T extends 'ranges'
        ? DayInfo[]
        : never

export type YearReturnType<T extends YearType> = T extends 'number'
  ? number
  : T extends 'begin' | 'final'
    ? Dayjs
    : T extends 'range'
      ? YearRange
      : T extends 'ranges'
        ? MonthInfo[]
        : never

/**
 * 日期时间服务接口
 * @remarks
 * 全局单例门面：统一 timezone / locale / format / utc；
 * 薄代理对齐 dayjs；`day` / `month` / `quarter` / `year` 提供 dayjs 没有的结构化日历结果。
 */
export interface TimeSphereImpl {
  /** 部分更新全局配置，立即作用于后续调用 */
  updateOptions(config: Partial<TimeSphereOptions>): void

  /** 读取当前全局配置快照（只读拷贝） */
  findOptions(): Readonly<TimeSphereOptions>

  /** 当前时刻（受 utc / timezone 约束） */
  now(): Dayjs

  /** 按全局配置解析为 Dayjs */
  parse(date?: ConfigType): Dayjs

  /**
   * 格式化；省略 format 时使用 options.format
   */
  format(date: ConfigType, format?: string): string

  /**
   * 相对 timeSphere.now() 的相对时间文案（受 locale 影响）
   */
  fromNow(date: ConfigType, withoutSuffix?: boolean): string

  isValid(date: ConfigType): boolean

  /** -1 早于 / 0 相等 / 1 晚于（按 unit） */
  compare(source: ConfigType, target: ConfigType, unit: UnitType): number

  /** 对齐 dayjs.add，输入先经 parse */
  add(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs

  /** 对齐 dayjs.subtract，输入先经 parse */
  subtract(target: ConfigType, amount: number, unit: UnitType): Dayjs

  /** source.diff(target, unit) */
  diff(source: ConfigType, target: ConfigType, unit: UnitType): number

  isBetween(
    target: ConfigType,
    rangeStart: ConfigType,
    rangeEnd: ConfigType,
    unit?: OpUnitType
  ): boolean

  /** 相对配置时区下的「今天」 */
  isToday(target: ConfigType): boolean

  /** 相对配置时区下的「明天」 */
  isTomorrow(target: ConfigType): boolean

  /** 相对配置时区下的「昨天」 */
  isYesterday(target: ConfigType): boolean

  /**
   * 日维度
   * @remarks ofYear 年内第几天；ofMonth 月内日；begin/final；range 当日结构；ranges 区间每日（默认到月末）
   */
  day<T extends DayType>(target: ConfigType, type: T, rangeEnd?: ConfigType): DayReturnType<T>

  /**
   * 季维度
   * @remarks number；begin/final；range；ranges 季内月；next 下一季
   */
  quarter<T extends QuarterType>(target: ConfigType, type: T): QuarterReturnType<T>

  /**
   * 月维度
   * @remarks number 1–12；begin/final；range；ranges 月内每日（weekOfMonth 以周一起算）
   */
  month<T extends MonthType>(target: ConfigType, type: T): MonthReturnType<T>

  /**
   * 年维度
   * @remarks number；begin/final；range（含闰年）；ranges 年内月
   */
  year<T extends YearType>(target: ConfigType, type: T): YearReturnType<T>

  toTimestamp(datetime: ConfigType): number
}
