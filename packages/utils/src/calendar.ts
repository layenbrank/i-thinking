/**
 * 日历服务模块
 * @module calendar
 * @description 基于 timeSphere 的阴阳历域门面（tyme4ts + lunisolar）
 * @packageDocumentation
 */

import type { ConfigType } from 'dayjs'
import lunisolar from 'lunisolar'
import festivals from 'lunisolar/markers/festivals.zh-cn'
import {
  EarthBranch,
  LegalHoliday,
  LunarDay,
  LunarMonth,
  LunarYear,
  SolarDay,
  SolarMonth,
  SolarYear,
  type Direction
} from 'tyme4ts'
import { Singleton } from './singleton'
import { timeSphere } from './time-sphere'

interface DirectionInfo {
  joyDirection: Direction
  yangDirection: Direction
  yinDirection: Direction
  wealthDirection: Direction
  mascotDirection: Direction
}

interface DateInfo {
  zodiac: string
  constellation: string
  festival: string | null
  beneficial: string
  unbeneficial: string
  phase: string
  phenologyDay: string
  directions: DirectionInfo
}

interface FestivalInfo {
  legal: string | null
  lunar: string | null
  solar: string | null
  term: string | null
}

interface NextFestivalInfo {
  name: string
  distance: number
}

type FestivalType = 'legal' | 'solar' | 'lunar' | 'term'

interface FestivalDetail {
  name: string
  type: FestivalType
  date: string
}

type CalendarUnit = 'day' | 'month' | 'year'
type CalendarKind = 'solar' | 'lunar'

interface SolarFestivalEntry {
  festival: string
  solar: string
}

interface LunarFestivalEntry {
  festival: string
  lunar: string
}

type FestivalsByReturn<T extends CalendarKind> = T extends 'solar'
  ? SolarFestivalEntry | SolarFestivalEntry[] | null
  : LunarFestivalEntry | LunarFestivalEntry[] | null

const MAX_NEXT_FESTIVAL_DAYS = 730
const LUNAR_FORMAT = 'lY年 lMlD'

/**
 * 阴阳历域门面
 *
 * @example
 * ```typescript
 * calendar.format('2024-02-10')
 * calendar.festival('2024-02-10')
 * calendar.nextFestival('2024-02-09')
 * calendar.festivals('2024-02-01', '2024-02-28', false)
 * calendar.count('2024-02-01', 'month', 'solar')
 * ```
 */
@Singleton()
class Calendar {
  constructor() {
    lunisolar.Markers.add(festivals)
  }

  /**
   * 当日四槽节日（互斥：legal / lunar / solar / term）
   */
  private festivalsByDate(year: number, month: number, day: number): FestivalInfo {
    const solarDay = SolarDay.fromYmd(year, month, day)
    const lunar = solarDay.getLunarDay()
    const lunarDayFrom = LunarDay.fromYmd(lunar.getYear(), lunar.getMonth(), lunar.getDay())
    const formatted = timeSphere.format(`${year}-${month}-${day}`, 'YYYY-MM-DD')
    const legal = LegalHoliday.fromYmd(year, month, day)?.getName() ?? null
    const tymeSolar = solarDay.getFestival()?.getName()
    const markersList = lunisolar(formatted).markers.list
    const markerName = markersList.length ? markersList[0].name : undefined
    const solar = tymeSolar ?? markerName ?? null
    return {
      legal,
      lunar: lunarDayFrom.getFestival()?.getName() ?? null,
      solar: legal && solar === legal ? null : solar,
      term: lunisolar(formatted).solarTerm?.toString() ?? null
    }
  }

  private parseYmd(date: ConfigType): { year: number; month: number; day: number; date: string } {
    const parsed = timeSphere.parse(date)
    const year = parsed.year()
    const month = parsed.month() + 1
    const day = parsed.date()
    return {
      year,
      month,
      day,
      date: parsed.format('YYYY-MM-DD')
    }
  }

  private lunarYear(date: ConfigType): LunarYear {
    const { year, month, day } = this.parseYmd(date)
    const lunarDay = SolarDay.fromYmd(year, month, day).getLunarDay()
    return LunarYear.fromYear(lunarDay.getYear())
  }

  private pickFestivalName(info: FestivalInfo): string | null {
    return info.legal ?? info.lunar ?? info.solar ?? info.term ?? null
  }

  private collectDayFestivals(date: ConfigType, enumable: boolean): FestivalDetail[] {
    const parsed = timeSphere.parse(date)
    const { year, month, day, date: formatted } = this.parseYmd(parsed)
    const info = this.festivalsByDate(year, month, day)
    const festivals: FestivalDetail[] = []
    if (info.legal) {
      const isSkip =
        !enumable && this.hasSameFestival(parsed.subtract(1, 'day'), info.legal)
      if (!isSkip) {
        festivals.push({ name: info.legal, type: 'legal', date: formatted })
      }
    }
    if (info.lunar) {
      festivals.push({ name: info.lunar, type: 'lunar', date: formatted })
    }
    if (info.solar) {
      festivals.push({ name: info.solar, type: 'solar', date: formatted })
    }
    if (info.term) {
      festivals.push({ name: info.term, type: 'term', date: formatted })
    }
    return festivals
  }

  /**
   * 单日节日摘要名：legal > lunar > solar > term
   */
  festival(date: ConfigType): string | null {
    const { year, month, day } = this.parseYmd(date)
    return this.pickFestivalName(this.festivalsByDate(year, month, day))
  }

  /**
   * 从次日起查找下一节日（最多两年）
   */
  nextFestival(date: ConfigType): NextFestivalInfo {
    const startDate = timeSphere.parse(date)
    let currentDate = startDate.add(1, 'day')
    let searchCount = 0
    while (searchCount < MAX_NEXT_FESTIVAL_DAYS) {
      const name = this.festival(currentDate)
      if (name) {
        return {
          name,
          distance: currentDate.diff(startDate, 'day')
        }
      }
      currentDate = currentDate.add(1, 'day')
      searchCount++
    }
    throw new Error('未能在搜索范围内找到下一个节日')
  }

  /**
   * 六十甲子年（按农历日所属年）
   */
  sixtyCycle(date: ConfigType) {
    const year = this.lunarYear(date)
    const cycle = year.getSixtyCycle()
    const heavenStem = cycle.getHeavenStem().getName()
    const earthBranch = cycle.getEarthBranch().getName()
    const zodiac = EarthBranch.fromName(earthBranch).getZodiac().getName()
    return {
      heavenStem,
      earthBranch,
      zodiac,
      lunarYear: year.getName()
    }
  }

  directions(lunarYear: LunarYear): DirectionInfo {
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
   * 农历日完整摘要
   */
  lunarDay(date: ConfigType): DateInfo {
    const { year, month, day } = this.parseYmd(date)
    const solarDay = SolarDay.fromYmd(year, month, day)
    const yearInfo = this.lunarYear(date)
    const dayInfo = solarDay.getLunarDay()
    const earthBranch = yearInfo.getSixtyCycle().getEarthBranch().getName()
    const zodiac = EarthBranch.fromName(earthBranch).getZodiac().getName()
    return {
      zodiac,
      constellation: `${solarDay.getConstellation()}座`,
      festival: this.festival(date),
      beneficial: dayInfo.getRecommends().join('、'),
      unbeneficial: dayInfo.getAvoids().join('、'),
      phase: dayInfo.getPhase().getName(),
      phenologyDay: solarDay.getPhenologyDay().getName(),
      directions: this.directions(yearInfo)
    }
  }

  /**
   * 农历格式化
   */
  format(date: ConfigType, format: string = LUNAR_FORMAT): string {
    return lunisolar(timeSphere.format(date, 'YYYY-MM-DD')).format(format)
  }

  legalHoliday(date: ConfigType): FestivalDetail | null {
    const { year, month, day, date: formatted } = this.parseYmd(date)
    const holiday = LegalHoliday.fromYmd(year, month, day)
    if (!holiday) return null
    return {
      name: holiday.getName(),
      type: 'legal',
      date: formatted
    }
  }

  solarFestival(date: ConfigType): FestivalDetail | null {
    const { year, month, day, date: formatted } = this.parseYmd(date)
    const festival = SolarDay.fromYmd(year, month, day).getFestival()
    if (!festival) return null
    return {
      name: festival.getName(),
      type: 'solar',
      date: formatted
    }
  }

  lunarFestival(date: ConfigType): FestivalDetail | null {
    const { year, month, day, date: formatted } = this.parseYmd(date)
    const lunarDay = SolarDay.fromYmd(year, month, day).getLunarDay()
    const festival = LunarDay.fromYmd(
      lunarDay.getYear(),
      lunarDay.getMonth(),
      lunarDay.getDay()
    ).getFestival()
    if (!festival) return null
    return {
      name: festival.getName(),
      type: 'lunar',
      date: formatted
    }
  }

  /**
   * 按历法 unit 枚举节日（农历 year 含闰月）
   */
  festivalsBy<T extends CalendarKind>(
    date: ConfigType,
    unit: CalendarUnit,
    type: T
  ): FestivalsByReturn<T> {
    const { year: y, month: m, day: d, date: formatted } = this.parseYmd(date)
    const solar = SolarDay.fromYmd(y, m, d)
    if (type === 'solar') {
      if (unit === 'day') {
        let festivalName = solar.getFestival()?.getName()
        if (!festivalName) {
          const [value] = lunisolar(formatted).markers.list
          festivalName = value?.name
        }
        if (!festivalName) return null as FestivalsByReturn<T>
        return { festival: festivalName, solar: formatted } as FestivalsByReturn<T>
      }
      if (unit === 'month') {
        const festivals: SolarFestivalEntry[] = []
        for (const day of SolarMonth.fromYm(y, m).getDays()) {
          const festivalName = day.getFestival()?.getName()
          if (!festivalName) continue
          festivals.push({
            festival: festivalName,
            solar: timeSphere.format(`${y}-${m}-${day.getDay()}`, 'YYYY-MM-DD')
          })
        }
        return festivals as FestivalsByReturn<T>
      }
      const festivals: SolarFestivalEntry[] = []
      for (const month of SolarYear.fromYear(y).getMonths()) {
        for (const day of month.getDays()) {
          const festivalName = day.getFestival()?.getName()
          if (!festivalName) continue
          festivals.push({
            festival: festivalName,
            solar: timeSphere.format(
              `${y}-${month.getMonth()}-${day.getDay()}`,
              'YYYY-MM-DD'
            )
          })
        }
      }
      return festivals as FestivalsByReturn<T>
    }
    const lunarDay = solar.getLunarDay()
    const yy = lunarDay.getYear()
    const mm = lunarDay.getMonth()
    const dd = lunarDay.getDay()
    if (unit === 'day') {
      const festivalName = LunarDay.fromYmd(yy, mm, dd).getFestival()?.getName()
      if (!festivalName) return null as FestivalsByReturn<T>
      return {
        festival: festivalName,
        lunar: `${yy}-${mm}-${dd}`
      } as FestivalsByReturn<T>
    }
    if (unit === 'month') {
      const festivals: LunarFestivalEntry[] = []
      for (const day of LunarMonth.fromYm(yy, mm).getDays()) {
        const festivalName = day.getFestival()?.getName()
        if (!festivalName) continue
        festivals.push({
          festival: festivalName,
          lunar: `${yy}-${mm}-${day.getDay()}`
        })
      }
      return festivals as FestivalsByReturn<T>
    }
    const festivals: LunarFestivalEntry[] = []
    for (const month of LunarYear.fromYear(yy).getMonths()) {
      for (const day of month.getDays()) {
        const festivalName = day.getFestival()?.getName()
        if (!festivalName) continue
        festivals.push({
          festival: festivalName,
          lunar: `${yy}-${month.getMonth()}-${day.getDay()}`
        })
      }
    }
    return festivals as FestivalsByReturn<T>
  }

  term(date: ConfigType): string | null {
    const formatted = timeSphere.format(date, 'YYYY-MM-DD')
    return lunisolar(formatted).solarTerm?.toString() ?? null
  }

  /**
   * 天数矩阵：solar/lunar × day/month/year
   */
  count(date: ConfigType, unit: CalendarUnit, type: CalendarKind): number {
    const { year, month, day } = this.parseYmd(date)
    if (type === 'solar') {
      if (unit === 'day') return 1
      if (unit === 'month') return SolarMonth.fromYm(year, month).getDayCount()
      return SolarYear.fromYear(year).getDayCount()
    }
    const lunarDay = SolarDay.fromYmd(year, month, day).getLunarDay()
    if (unit === 'day') return 1
    if (unit === 'month') {
      return LunarMonth.fromYm(lunarDay.getYear(), lunarDay.getMonth()).getDayCount()
    }
    return LunarYear.fromYear(lunarDay.getYear()).getDayCount()
  }

  /**
   * 单日或闭区间节日列表
   * @param enumable 是否展开多日法定假的每一天；false 时只保留首日，默认 true
   */
  festivals(
    source: ConfigType,
    target?: ConfigType,
    enumable: boolean = true
  ): FestivalDetail[] {
    const begin = timeSphere.parse(source).startOf('day')
    const end = timeSphere.parse(target ?? source).startOf('day')
    if (end.isBefore(begin, 'day')) {
      return []
    }
    const festivals: FestivalDetail[] = []
    let cursor = begin
    while (!cursor.isAfter(end, 'day')) {
      festivals.push(...this.collectDayFestivals(cursor, enumable))
      cursor = cursor.add(1, 'day')
    }
    return festivals
  }

  private hasSameFestival(date: ConfigType, festivalName: string): boolean {
    const { year, month, day } = this.parseYmd(date)
    const holiday = LegalHoliday.fromYmd(year, month, day)
    return holiday?.getName() === festivalName
  }
}

const calendar = new Calendar()

export { calendar }
export type {
  CalendarKind,
  CalendarUnit,
  DateInfo,
  DirectionInfo,
  FestivalDetail,
  FestivalInfo,
  FestivalType,
  LunarFestivalEntry,
  NextFestivalInfo,
  SolarFestivalEntry
}
