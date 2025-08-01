import type { Dayjs, ConfigType, UnitType, OpUnitType } from 'dayjs'

export type LocaleType = 'zh-cn' | 'en'

/**
 * 星期格式类型
 * @remarks
 * - number: 数字格式（1-7，周一到周日）
 * - cn: 中文简写（周一、周二...）
 * - cnLong: 中文全称（星期一、星期二...）
 * - en: 英文简写（Sun、Mon...）
 * - enLong: 英文全称（Sunday、Monday...）
 */
// export type WeekFormat = 'number' | 'cn' | 'cnLong' | 'en' | 'enLong'

/**
 * 星期映射表类型
 * @remarks
 * 定义了星期名称和索引转换的接口
 */
// export interface WeekMap {
//   /** 星期名称数组 */
//   names: readonly string[]
//   /** 将 dayjs 的星期索引转换为目标格式的索引 */
//   getIndex: (day: number) => number
// }

/**
 * 日期格式化策略接口
 * @remarks
 * 定义了日期格式化的标准接口，可以实现自定义的格式化逻辑
 */
export interface FormatStrategyImpl {
	/**
	 * 格式化日期
	 * @param target - 要格式化的日期
	 * @param format - 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
	 * @returns 格式化后的字符串
	 */
	format(target: ConfigType, format?: string): string
}

/**
 * 日期计算策略接口
 * @remarks
 * 定义了日期计算的标准接口，包括添加、减少和计算差值
 */
export interface CalculationStrategyImpl {
	/**
	 * 添加时间
	 * @param target - 目标日期
	 * @param amount - 要添加的数量
	 * @param unit - 时间单位（年、月、日、时、分、秒等）
	 * @returns 新的日期对象
	 */
	add(target: ConfigType, amount: number, unit: UnitType): Dayjs

	/**
	 * 减少时间
	 * @param target - 目标日期
	 * @param amount - 要减少的数量
	 * @param unit - 时间单位（年、月、日、时、分、秒等）
	 * @returns 新的日期对象
	 */
	subtract(target: ConfigType, amount: number, unit: UnitType): Dayjs

	/**
	 * 计算时间差
	 * @param source - 基准日期
	 * @param target - 比较日期
	 * @param unit - 时间单位（年、月、日、时、分、秒等）
	 * @returns 时间差值
	 */
	diff(source: ConfigType, target: ConfigType, unit: UnitType): number
}

/**
 * 工作日计算策略接口
 * @remarks
 * 定义了工作日相关的标准接口，可以实现自定义的工作日判断逻辑
 * 例如处理法定节假日、调休等特殊情况
 */
export interface WorkdayStrategyImpl {
	/**
	 * 判断是否是工作日
	 * @param target - 要判断的日期
	 * @returns 是否是工作日
	 */
	// isWorkday(target: ConfigType): boolean
	isWorkday<
		T extends ConfigType,
		F extends WeekFormat,
		L extends F extends 'short' ? WeekShort<LocaleType> : WeekLong<LocaleType>
	>(
		target: T,
		format?: F,
		workDays?: L
	): boolean

	/**
	 * 获取下一个工作日
	 * @param target - 基准日期
	 * @returns 下一个工作日
	 */
	nextWorkday(target: ConfigType): Dayjs

	/**
	 * 计算工作日天数
	 * @param source - 开始日期
	 * @param target - 结束日期
	 * @returns 工作日天数
	 */
	countWorkdays(source: ConfigType, target: ConfigType): number
}

export type WeekShort<T extends LocaleType = 'zh-cn'> = T extends 'zh-cn'
	? ('周一' | '周二' | '周三' | '周四' | '周五' | '周六' | '周日')[]
	: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[]

export type WeekLong<T = 'zh-cn'> = T extends 'zh-cn'
	? ('星期一' | '星期二' | '星期三' | '星期四' | '星期五' | '星期六' | '星期日')[]
	: ('Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[]

export type WeekDayType = 'day' | 'weekday' | 'isoWeekday'

export type WeekFormat = 'short' | 'long'

export type WeekFormatMaps = Record<LocaleType, WeekShort<LocaleType> | WeekLong<LocaleType>>
export type WeeksMaps = Record<WeekFormat, WeekFormatMaps>

/**
 * 星期格式化策略接口
 */
export interface WeekStrategyImpl {
	// format(day: number, format: WeekFormat): string | number
	week(target: ConfigType, format: 'short' | 'long'): string
	weekStartOf(target: ConfigType): Dayjs
	weekEndOf(target: ConfigType): Dayjs
	weekDay(target: ConfigType, type: 'day' | 'weekday' | 'isoWeekday'): number
}

/**
 * 日期时间配置选项
 * @remarks
 * 支持运行时动态配置，所有选项都是可选的
 */
export interface TimeSphereConfig extends Record<string, unknown> {
	/** 默认时区，例如 'Asia/Shanghai'，'America/New_York' 等 */
	timezone?: string
	/** 默认语言，支持 'zh-cn'（中文）和 'en'（英文）*/
	locale?: LocaleType & string
	/** 默认日期格式，使用 dayjs 的格式字符串，例如 'YYYY-MM-DD HH:mm:ss' */
	format?: string
	/** 是否使用 UTC 时间，true 表示使用 UTC，false 表示使用本地时间 */
	utc?: boolean
	/** 日期格式化策略，用于自定义日期格式化逻辑 */
	formatStrategy?: FormatStrategyImpl
	/** 日期计算策略，用于自定义日期计算逻辑 */
	calculationStrategy?: CalculationStrategyImpl
	/** 工作日计算策略，用于自定义工作日判断和计算逻辑 */
	workdayStrategy?: WorkdayStrategyImpl
	/** 星期格式化策略，用于自定义星期格式化逻辑 */
	weekFormatStrategy?: WeekStrategyImpl
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
export interface TimeSphereImpl extends WeekStrategyImpl, WorkdayStrategyImpl {
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
	updateConfig(config: Partial<TimeSphereConfig>): Promise<void>

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
	 * @param source - 基准日期
	 * @param target - 比较日期
	 * @returns -1(早于), 0(相等), 1(晚于)
	 */
	compare(source: ConfigType, target: ConfigType): number

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
	 * @param target - 目标日期
	 * @param amount - 减少的数量
	 * @param unit - 时间单位
	 * @returns Dayjs 实例
	 */
	subtract(target: ConfigType, amount: number, unit: UnitType): Dayjs

	/**
	 * 计算时间差
	 * @param source - 基准日期
	 * @param target - 比较日期
	 * @param unit - 时间单位
	 * @returns 时间差
	 */
	diff(source: ConfigType, target: ConfigType, unit: UnitType): number

	/**
	 * 判断日期是否在范围内
	 * @param target - 目标日期
	 * @param rangeStart - 范围开始日期
	 * @param rangeEnd - 范围结束日期
	 * @param unit - 时间单位
	 * @returns 是否在范围内
	 */
	isBetween(
		target: ConfigType,
		rangeStart: ConfigType,
		rangeEnd: ConfigType,
		unit?: OpUnitType
	): boolean

	// /**
	//  * 工作日相关操作
	//  */
	// workday: {
	//   /**
	//    * 判断是否是工作日
	//    * @param target - 要检查的日期
	//    * @returns 是否是工作日
	//    */
	//   isWorkday(target: ConfigType): boolean
	//   isWorkday<F extends WeekFormat, L extends LocaleType>(
	//     target: ConfigType,
	//     format: F,
	//     workDays: F extends 'short' ? WeekShort<L> : WeekLong<L>
	//   ): boolean

	//   /**
	//    * 获取下一个工作日
	//    * @param target - 基准日期
	//    * @returns 下一个工作日
	//    */
	//   nextWorkday(target: ConfigType): Dayjs

	//   /**
	//    * 计算工作日天数
	//    * @param source - 开始日期
	//    * @param target - 结束日期
	//    * @returns 工作日天数
	//    */
	//   countWorkdays(source: ConfigType, target: ConfigType): number
	// }

	/**
	 * 季度相关操作
	 */
	// quarter: {
	//   /**
	//    * 获取季度数
	//    * @param target - 日期
	//    * @returns 季度数（1-4）
	//    */
	//   get(target: ConfigType): number

	//   /**
	//    * 获取季度开始时间
	//    * @param target - 日期
	//    * @returns 季度开始时间
	//    */
	//   startOf(target: ConfigType): Dayjs

	//   /**
	//    * 获取季度结束时间
	//    * @param target - 日期
	//    * @returns 季度结束时间
	//    */
	//   endOf(target: ConfigType): Dayjs
	// }

	/**
	 * 周相关操作
	 */
	// week: {
	//   /**
	//    * 获取周数
	//    * @param target - 日期
	//    * @returns 周数（1-53）
	//    */
	//   get(target: ConfigType): number

	//   /**
	//    * 获取周开始时间（根据语言环境自动调整）
	//    * @param target - 日期
	//    * @returns 周开始时间
	//    */
	//   startOf(target: ConfigType): Dayjs

	//   /**
	//    * 获取周结束时间（根据语言环境自动调整）
	//    * @param target - 日期
	//    * @returns 周结束时间
	//    */
	//   endOf(target: ConfigType): Dayjs
	// }

	// weekDay(target: ConfigType, format: 'short' | 'long'): string

	// weekDayStart(target: ConfigType): Dayjs

	// weekDayEnd(target: ConfigType): Dayjs
}
