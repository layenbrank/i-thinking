import type { ConfigType, Dayjs, OpUnitType, UnitType } from 'dayjs'

/**
 * 日期时间配置选项
 * @remarks
 * 支持运行时动态配置，所有选项都是可选的
 */
export interface TimeSphereOptions extends Record<string, unknown> {
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
 * 定义了完整的日期时间处理功能，包括：
 * - 基础日期操作（解析、格式化、验证）
 * - 日期计算（加减、比较、范围判断）
 * - 工作日处理
 * - 季度处理
 * - 周处理
 * - 国际化支持
 * - 时区处理
 */
export interface TimeSphereImpl {
	/**
	 * 更新配置
	 */
	updateOptions(config: Partial<TimeSphereOptions>): void

	/**
	 * 获取当前时间
	 */
	now(): Dayjs

	/**
	 * 解析日期
	 */
	parse(date?: ConfigType): Dayjs

	/**
	 * 格式化日期
	 * @example
	 * ```typescript
	 * const service = new TimeSphere()
	 *
	 * // 基本格式化
	 * service.format(new Date()) // => "2024-01-20 14:30:45"
	 *
	 * // 自定义格式
	 * service.format(new Date(), 'YYYY年MM月DD日') // => "2024年01月20日"
	 * service.format(new Date(), 'HH:mm') // => "14:30"
	 * ```
	 */
	format(date: ConfigType, format?: string): string

	/**
	 * 获取相对时间
	 * @remarks
	 * 返回相对时间字符串，例如 "2小时前"
	 */
	fromNow(date: ConfigType, withoutSuffix?: boolean): string

	/**
	 * 验证日期是否有效
	 */
	isValid(date: ConfigType): boolean

	/**
	 * 比较两个日期
	 * @remarks
	 * 返回 -1(早于), 0(相等), 1(晚于)
	 */
	compare(source: ConfigType, target: ConfigType, unit: UnitType): number

	/**
	 * 添加时间
	 */
	increment(targetDate: ConfigType, amount: number, unit: UnitType): Dayjs

	/**
	 * 减少时间
	 */
	decrement(target: ConfigType, amount: number, unit: UnitType): Dayjs

	/**
	 * 计算时间差
	 */
	diff(source: ConfigType, target: ConfigType, unit: UnitType): number

	/**
	 * 判断日期是否在范围内
	 */
	isBetween(
		target: ConfigType,
		rangeStart: ConfigType,
		rangeEnd: ConfigType,
		unit?: OpUnitType
	): boolean

	/**
	 * 判断是否是今天
	 */
	isToday(target: ConfigType): boolean

	/**
	 * 判断是否是明天
	 */
	isTomorrow(target: ConfigType): boolean

	/**
	 * 判断是否是昨天
	 */
	isYesterday(target: ConfigType): boolean

	/**
	 * 获取周数或周的时间范围
	 * @remarks
	 * type: ofYear(当年第几周), ofMonth(当月第几周), range/ranges/next(周范围)
	 */
	day<T extends DayType>(target: ConfigType, type: T, rangeEnd?: ConfigType): DayReturnType<T>

	/**
	 * 获取季度数字、开始或结束时间、范围信息
	 * @remarks
	 * type: number(第几季度), begin(季度开始), final(季度结束), range(季度范围), ranges(季度内所有月份), next(下一季度)
	 */
	quarter<T extends QuarterType>(target: ConfigType, type: T): QuarterReturnType<T>

	/**
	 * 获取月份数字、开始或结束时间、范围信息
	 * @remarks
	 * type: number(月份数字), begin(月初), final(月末), range(月份范围), ranges(月份内所有天)
	 */
	month<T extends MonthType>(target: ConfigType, type: T): MonthReturnType<T>

	/**
	 * 获取年份数字、开始或结束时间、范围信息
	 */
	year<T extends YearType>(target: ConfigType, type: T): YearReturnType<T>

	/**
	 * 转换为时间戳
	 */
	toTimestamp(datetime: ConfigType): number
}
