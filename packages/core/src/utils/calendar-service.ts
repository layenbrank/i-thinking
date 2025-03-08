/**
 * 日历服务模块
 * @module calendar-service
 * @description 整合 tyme4ts 和 lunisolar 的日历服务，提供完整的阴阳历处理功能
 * @packageDocumentation
 */

import lunisolar from 'lunisolar'
import festivals from 'lunisolar/markers/festivals.zh-cn'
import {
  EarthBranch,
  LunarDay,
  LunarMonth,
  LunarYear,
  SolarDay,
  SolarMonth,
  SolarWeek,
  LegalHoliday,
  SolarFestival,
  LunarFestival,
  type Direction
} from 'tyme4ts'
import { Singleton } from './singleton'
import { dateTimeService } from './date-time-service'
import type { ConfigType } from 'dayjs'

// 全局加载农历节日
lunisolar.Markers.add(festivals)

/**
 * 方位信息接口
 * @interface DirectionInfo
 * @description 包含各种神位方位的信息
 */
interface DirectionInfo {
  /** 喜神方位 */
  joyDirection: Direction
  /** 阳贵神方位 */
  yangDirection: Direction
  /** 阴贵神方位 */
  yinDirection: Direction
  /** 财神方位 */
  wealthDirection: Direction
  /** 福神方位 */
  mascotDirection: Direction
}

/**
 * 日期信息接口
 * @interface DateInfo
 * @description 包含日期的完整信息，包括生肖、星座、节日等
 */
interface DateInfo {
  /** 生肖 */
  zodiac: string
  /** 星座 */
  constellation: string
  /** 节日 */
  festival: string | null
  /** 宜 */
  beneficial: string
  /** 忌 */
  unbeneficial: string
  /** 月相 */
  phase: string
  /** 物候 */
  phenologyDay: string
  /** 方位信息 */
  directions: DirectionInfo
}

/**
 * 节日信息接口
 * @interface FestivalInfo
 * @description 包含农历、公历节日和节气信息
 */
interface FestivalInfo {
  /** 农历节日 */
  lunarFestival: string | null
  /** 公历节日 */
  solarFestival: string | null
  /** 节气 */
  solarTerm: string | null
}

/**
 * 下一个节日信息接口
 * @interface NextFestivalInfo
 * @description 包含下一个节日的名称和距离天数
 */
interface NextFestivalInfo {
  /** 节日名称 */
  name: string
  /** 距离天数 */
  distance: number
}

/**
 * 节日类型
 * @type FestivalType
 * @description 节日的类型：法定节日、公历节日或农历节日
 */
type FestivalType = 'legal' | 'solar' | 'lunar'

/**
 * 节日详细信息接口
 * @interface FestivalDetail
 * @description 包含节日的详细信息，包括名称、类型、日期和可选的起止时间
 */
interface FestivalDetail {
  /** 节日名称 */
  name: string
  /** 节日类型 */
  type: FestivalType
  /** 节日日期 */
  date: Date
  /** 节日开始时间（可选） */
  startDate?: Date
  /** 节日结束时间（可选） */
  endDate?: Date
}

/**
 * 节日查询选项接口
 * @interface FestivalOptions
 * @description 配置节日查询的选项
 */
interface FestivalOptions {
  /** 是否包含起止时间 */
  includeRange?: boolean
  /** 是否只返回节日的第一天（例如春节假期只返回第一天） */
  onlyFirstDay?: boolean
}

/**
 * 日历服务类
 * @class Calendar
 * @description 整合 tyme4ts 和 lunisolar 的日历服务，提供完整的阴阳历处理功能
 *
 * @example
 * ```typescript
 * // 基本使用
 * const date = new Date()
 *
 * // 获取农历信息
 * const lunarDate = calendarService.getLunarDate(date)
 * console.log('农历日期:', lunarDate)
 *
 * // 获取节日信息
 * const festival = calendarService.getFestival(date)
 * console.log('当前节日:', festival)
 *
 * // 获取下一个节日
 * const nextFestival = calendarService.getNextFestival(date)
 * console.log('下一个节日:', nextFestival.name)
 * console.log('距离天数:', nextFestival.distance)
 *
 * // 获取完整日期信息
 * const dateInfo = calendarService.getDateInfo(date)
 * console.log('生肖:', dateInfo.zodiac)
 * console.log('星座:', dateInfo.constellation)
 * console.log('宜:', dateInfo.beneficial)
 * console.log('忌:', dateInfo.unbeneficial)
 * ```
 */
@Singleton()
class Calendar {
  /**
   * 获取指定日期的所有节日信息
   * @private
   * @param year - 年份
   * @param month - 月份（1-12）
   * @param day - 日期（1-31）
   * @returns 包含农历节日、公历节日和节气的信息
   */
  private getFestivalsByDate(year: number, month: number, day: number): FestivalInfo {
    const solarDay = SolarDay.fromYmd(year, month, day)
    const lunar = solarDay.getLunarDay()
    const lunarDayFrom = LunarDay.fromYmd(lunar.getYear(), lunar.getMonth(), lunar.getDay())

    return {
      lunarFestival: lunarDayFrom.getFestival()?.getName() ?? null,
      solarFestival: (() => {
        const festival = solarDay.getFestival()?.getName()
        const holiday = LegalHoliday.fromYmd(year, month, day)?.getName()
        const markersList = lunisolar(`${year}-${month}-${day}`).markers.list
        if (holiday) return holiday
        if (festival) return festival
        if (markersList.length) return markersList[0].name
        return null
      })(),
      solarTerm: lunisolar(`${year}-${month}-${day}`).solarTerm?.toString() ?? null
    }
  }

  /**
   * 获取当天节日信息
   * @param date - 目标日期
   * @returns 节日名称，如果没有则返回 null
   *
   * @example
   * ```typescript
   * const festival = calendarService.getFestival(new Date())
   * console.log('今天的节日:', festival) // 例如：'春节'、'元宵节'、'清明' 等
   * ```
   */
  getFestival(date: ConfigType): string | null {
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]
    const { lunarFestival, solarFestival, solarTerm } = this.getFestivalsByDate(year, month, day)

    // 按优先级返回第一个节日
    return lunarFestival ?? solarFestival ?? solarTerm ?? null
  }

  /**
   * 获取下一个节日信息
   * @param date - 起始日期
   * @returns 下一个节日的信息，包含名称和距离天数
   * @description 按天查找下一个节日：
   * 1. 从明天开始，每天检查是否有节日
   * 2. 如果当天有多个节日，按法定节日 > 农历节日 > 公历节日 > 节气的优先级返回
   * 3. 查找范围为从明天开始的两年时间（确保能覆盖农历年和公历年的所有节日）
   *
   * @example
   * ```typescript
   * const nextFestival = calendarService.getNextFestival(new Date())
   * console.log('下一个节日:', nextFestival.name)
   * console.log('距离天数:', nextFestival.distance)
   * ```
   */
  getNextFestival(date: ConfigType): NextFestivalInfo {
    const startDate = dateTimeService.parse(date)
    let currentDate = startDate.add(1, 'day') // 从明天开始查找
    let searchCount = 0 // 搜索天数计数

    // 设置最大搜索天数为两年（确保能覆盖农历年和公历年的所有节日）
    const maxSearchDays = 730 // 365 * 2

    // 在最大搜索范围内查找
    while (searchCount < maxSearchDays) {
      // 1. 检查法定节日（包含了重要的农历节日，如春节）
      const legalHoliday = this.getLegalHoliday(currentDate)
      if (legalHoliday) {
        return {
          name: legalHoliday.name,
          distance: currentDate.diff(startDate, 'day')
        }
      }

      // 2. 检查农历节日
      const lunarFestival = this.getLunarFestival(currentDate)
      if (lunarFestival) {
        return {
          name: lunarFestival.name,
          distance: currentDate.diff(startDate, 'day')
        }
      }

      // 3. 检查公历节日
      const solarFestival = this.getSolarFestival(currentDate)
      if (solarFestival) {
        return {
          name: solarFestival.name,
          distance: currentDate.diff(startDate, 'day')
        }
      }

      // 4. 检查节气
      const solarTerm = lunisolar(
        dateTimeService.format(currentDate, 'YYYY-MM-DD')
      ).solarTerm?.toString()
      if (solarTerm) {
        return {
          name: solarTerm,
          distance: currentDate.diff(startDate, 'day')
        }
      }

      // 继续查找下一天
      currentDate = currentDate.add(1, 'day')
      searchCount++
    }

    // 如果在最大搜索范围内都没找到节日（实际上不会发生，因为节气每月都有）
    throw new Error('未能在搜索范围内找到下一个节日')
  }

  /**
   * 获取六十甲子年信息
   * @param date - 目标日期
   * @returns 六十甲子年的完整描述
   *
   * @example
   * ```typescript
   * const sixtyCycle = calendarService.getSixtyCycle(new Date())
   * console.log('六十甲子年:', sixtyCycle) // 例如：'甲子 鼠年'
   * ```
   */
  getSixtyCycle(date: ConfigType): string {
    const dateObj = dateTimeService.parse(date)
    const year = dateObj.year()
    const lunarYear = LunarYear.fromYear(year)
    const heavenStem = lunarYear.getSixtyCycle().getHeavenStem().getName()
    const earthBranch = lunarYear.getSixtyCycle().getEarthBranch().getName()
    const zodiac = EarthBranch.fromName(earthBranch).getZodiac().getName()
    return `${heavenStem}${earthBranch} ${zodiac}年`
  }

  /**
   * 获取周数和年内天数
   * @param date - 目标日期
   * @returns 周数和年内天数的描述
   *
   * @example
   * ```typescript
   * const weekInfo = calendarService.getWeekAndDayIndex(new Date())
   * console.log(weekInfo) // 例如：'本年第 1 周 第1天'
   * ```
   */
  getWeekAndDayIndex(date: ConfigType): string {
    const dateObj = dateTimeService.parse(date)
    const dayInYearIndex = dateTimeService.date.getDayOfYear(dateObj)
    const weekInYear = dateTimeService.week.get(dateObj)

    return `本年第 ${weekInYear} 周 第${dayInYearIndex}天`
  }

  /**
   * 获取方位信息
   * @private
   * @param lunarYear - 农历年对象
   * @returns 包含各种神位方位的信息
   */
  private getDirections(lunarYear: LunarYear): DirectionInfo {
    const heavenStem = lunarYear.getSixtyCycle().getHeavenStem()
    return {
      joyDirection: heavenStem.getJoyDirection(),
      yangDirection: heavenStem.getYangDirection(),
      yinDirection: heavenStem.getYinDirection(),
      wealthDirection: heavenStem.getWealthDirection(),
      mascotDirection: heavenStem.getMascotDirection()
    }
  }

  /**
   * 获取完整日期信息
   * @param date - 目标日期
   * @returns 包含生肖、星座、节日等完整信息
   *
   * @example
   * ```typescript
   * const dateInfo = calendarService.getDateInfo(new Date())
   * console.log('生肖:', dateInfo.zodiac)
   * console.log('星座:', dateInfo.constellation)
   * console.log('节日:', dateInfo.festival)
   * console.log('宜:', dateInfo.beneficial)
   * console.log('忌:', dateInfo.unbeneficial)
   * console.log('月相:', dateInfo.phase)
   * console.log('物候:', dateInfo.phenologyDay)
   * ```
   */
  getDateInfo(date: ConfigType): DateInfo {
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]
    const solarDay = SolarDay.fromYmd(year, month, day)
    const lunarYear = LunarYear.fromYear(year)
    const lunarDay = solarDay.getLunarDay()
    const earthBranch = lunarYear.getSixtyCycle().getEarthBranch().getName()
    const zodiac = EarthBranch.fromName(earthBranch).getZodiac().getName()

    return {
      zodiac,
      constellation: `${solarDay.getConstellation()}座`,
      festival: this.getFestival(dateObj),
      beneficial: lunarDay.getRecommends().join('、'),
      unbeneficial: lunarDay.getAvoids().toString(),
      phase: lunarDay.getPhase().getName(),
      phenologyDay: solarDay.getPhenologyDay().getName(),
      directions: this.getDirections(lunarYear)
    }
  }

  /**
   * 获取农历日期
   * @param date - 目标日期
   * @param format - 格式化模板，默认为 'lY年 lMlD'
   * @returns 格式化后的农历日期字符串
   *
   * @example
   * ```typescript
   * // 默认格式
   * const lunarDate = calendarService.getLunarDate(new Date())
   * console.log('农历日期:', lunarDate) // 例如：'甲子年 正月初一'
   *
   * // 自定义格式
   * const customFormat = calendarService.getLunarDate(new Date(), 'lY lM lD')
   * console.log('自定义格式:', customFormat)
   * ```
   */
  getLunarDate(date: ConfigType, format: string = 'lY年 lMlD'): string {
    return lunisolar(dateTimeService.format(date, 'YYYY-MM-DD')).format(format)
  }

  /**
   * 获取公历月当月天数
   * @param date - 目标日期
   * @returns 当月的天数
   *
   * @example
   * ```typescript
   * const days = calendarService.getSolarDayCount(new Date())
   * console.log('本月天数:', days) // 例如：31
   * ```
   */
  getSolarDayCount(date: ConfigType): number {
    const dateObj = dateTimeService.parse(date)
    const [year, month] = [dateObj.year(), dateObj.month() + 1]
    const solarMonth = SolarMonth.fromYm(year, month)
    return solarMonth.getDayCount()
  }

  /**
   * 获取农历月当月天数
   * @param date - 目标日期
   * @returns 当月的天数
   *
   * @example
   * ```typescript
   * const days = calendarService.getLunarDayCount(new Date())
   * console.log('农历本月天数:', days) // 例如：30
   * ```
   */
  getLunarDayCount(date: ConfigType): number {
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]
    const solarDay = SolarDay.fromYmd(year, month, day)
    const lunar = solarDay.getLunarDay()
    return LunarMonth.fromYm(lunar.getYear(), lunar.getMonth()).getDayCount()
  }

  /**
   * 获取法定节日
   * @param date - 目标日期
   * @returns 法定节日信息，如果不是法定节日则返回 null
   *
   * @example
   * ```typescript
   * const holiday = calendarService.getLegalHoliday(new Date())
   * if (holiday) {
   *   console.log('节日名称:', holiday.name)
   *   console.log('节日类型:', holiday.type)
   *   console.log('节日日期:', holiday.date)
   * }
   * ```
   */
  getLegalHoliday(date: ConfigType): FestivalDetail | null {
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]
    const holiday = LegalHoliday.fromYmd(year, month, day)

    if (!holiday) return null

    return {
      name: holiday.getName(),
      type: 'legal',
      date: dateObj.toDate()
    }
  }

  /**
   * 获取公历节日
   * @param date - 目标日期
   * @returns 公历节日信息，如果不是公历节日则返回 null
   *
   * @example
   * ```typescript
   * const festival = calendarService.getSolarFestival(new Date())
   * if (festival) {
   *   console.log('节日名称:', festival.name)
   *   console.log('节日类型:', festival.type)
   *   console.log('节日日期:', festival.date)
   * }
   * ```
   */
  getSolarFestival(date: ConfigType): FestivalDetail | null {
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]
    const solarDay = SolarDay.fromYmd(year, month, day)
    const festival = solarDay.getFestival()

    if (!festival) return null

    return {
      name: festival.getName(),
      type: 'solar',
      date: dateObj.toDate()
    }
  }

  /**
   * 获取农历节日
   * @param date - 目标日期
   * @returns 农历节日信息，如果不是农历节日则返回 null
   *
   * @example
   * ```typescript
   * const festival = calendarService.getLunarFestival(new Date())
   * if (festival) {
   *   console.log('节日名称:', festival.name)
   *   console.log('节日类型:', festival.type)
   *   console.log('节日日期:', festival.date)
   * }
   * ```
   */
  getLunarFestival(date: ConfigType): FestivalDetail | null {
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]
    const solarDay = SolarDay.fromYmd(year, month, day)
    const lunarDay = solarDay.getLunarDay()
    const lunarDayFrom = LunarDay.fromYmd(
      lunarDay.getYear(),
      lunarDay.getMonth(),
      lunarDay.getDay()
    )
    const festival = lunarDayFrom.getFestival()

    if (!festival) return null

    return {
      name: festival.getName(),
      type: 'lunar',
      date: dateObj.toDate()
    }
  }

  /**
   * 获取所有节日信息
   * @param date - 目标日期
   * @param options - 查询选项
   * @returns 所有类型节日的数组
   */
  getAllFestivals(date: ConfigType, options: FestivalOptions = {}): FestivalDetail[] {
    const festivals: FestivalDetail[] = []
    const { includeRange = false, onlyFirstDay = false } = options
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]

    // 一次性获取所有节日信息
    const { lunarFestival, solarFestival, solarTerm } = this.getFestivalsByDate(year, month, day)

    // 1. 处理法定节日
    const holiday = LegalHoliday.fromYmd(year, month, day)
    if (holiday) {
      // 如果设置了只返回第一天，则检查是否有前一天的相同节日
      if (!onlyFirstDay || !this.hasSameFestival(dateObj.subtract(1, 'day'), holiday.getName())) {
        const festivalDetail: FestivalDetail = {
          name: holiday.getName(),
          type: 'legal',
          date: dateObj.toDate()
        }
        if (includeRange) {
          festivals.push({
            ...festivalDetail,
            startDate: dateObj.toDate(),
            endDate: dateObj.toDate()
          })
        } else {
          festivals.push(festivalDetail)
        }
      }
    }

    // 2. 处理农历节日
    if (lunarFestival) {
      // 农历节日通常是单日节日，不需要特殊处理
      const festivalDetail: FestivalDetail = {
        name: lunarFestival,
        type: 'lunar',
        date: dateObj.toDate()
      }
      if (includeRange) {
        festivals.push({
          ...festivalDetail,
          startDate: dateObj.toDate(),
          endDate: dateObj.toDate()
        })
      } else {
        festivals.push(festivalDetail)
      }
    }

    // 3. 处理公历节日
    if (solarFestival) {
      // 公历节日通常是单日节日，不需要特殊处理
      const festivalDetail: FestivalDetail = {
        name: solarFestival,
        type: 'solar',
        date: dateObj.toDate()
      }
      if (includeRange) {
        festivals.push({
          ...festivalDetail,
          startDate: dateObj.toDate(),
          endDate: dateObj.toDate()
        })
      } else {
        festivals.push(festivalDetail)
      }
    }

    // 4. 处理节气
    if (solarTerm) {
      // 节气是单日节日，不需要特殊处理
      const festivalDetail: FestivalDetail = {
        name: solarTerm,
        type: 'solar',
        date: dateObj.toDate()
      }
      if (includeRange) {
        festivals.push({
          ...festivalDetail,
          startDate: dateObj.toDate(),
          endDate: dateObj.toDate()
        })
      } else {
        festivals.push(festivalDetail)
      }
    }

    return festivals
  }

  /**
   * 检查指定日期是否有相同的节日
   * @private
   * @param date - 要检查的日期
   * @param festivalName - 节日名称
   * @returns 是否有相同的节日
   */
  private hasSameFestival(date: ConfigType, festivalName: string): boolean {
    const dateObj = dateTimeService.parse(date)
    const [year, month, day] = [dateObj.year(), dateObj.month() + 1, dateObj.date()]
    const holiday = LegalHoliday.fromYmd(year, month, day)
    return holiday?.getName() === festivalName
  }
}

// 导出单例实例
export const calendarService = new Calendar()

// 导出类型
export type {
  DirectionInfo,
  DateInfo,
  FestivalInfo,
  NextFestivalInfo,
  FestivalType,
  FestivalDetail
}
