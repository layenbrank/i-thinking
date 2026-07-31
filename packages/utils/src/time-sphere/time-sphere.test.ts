import { afterEach, describe, expect, it } from 'vitest'

import { timeSphere } from './index'

const RESET_OPTIONS = {
  timezone: 'Asia/Shanghai',
  locale: 'zh-cn',
  format: 'YYYY-MM-DD HH:mm:ss',
  utc: false
} as const

afterEach(function () {
  timeSphere.updateOptions({ ...RESET_OPTIONS })
})

describe('全局配置：一键切换后行为统一', function () {
  it('findOptions 返回配置快照且不被外部 mutate 污染内部', function () {
    const snapshot = timeSphere.findOptions()
    expect(snapshot).toMatchObject(RESET_OPTIONS)
    ;(snapshot as { format?: string }).format = 'HH:mm'
    expect(timeSphere.findOptions().format).toBe(RESET_OPTIONS.format)
  })

  it('updateOptions 切换 format 后 format() 缺省格式立即变化', function () {
    timeSphere.updateOptions({ format: 'YYYY/MM/DD' })
    expect(timeSphere.format('2024-01-20 14:30:45')).toBe('2024/01/20')
  })

  it('updateOptions 切换 locale 后 weekday 文案变化', function () {
    timeSphere.updateOptions({ locale: 'zh-cn' })
    expect(timeSphere.parse('2024-01-20').format('dddd')).toBe('星期六')

    timeSphere.updateOptions({ locale: 'en' })
    expect(timeSphere.parse('2024-01-20').format('dddd')).toBe('Saturday')
  })

  it('updateOptions 切换 timezone 后 parse 偏移量变化', function () {
    timeSphere.updateOptions({ timezone: 'Asia/Shanghai', utc: false })
    expect(timeSphere.parse('2024-01-20 12:00:00').format('Z')).toBe('+08:00')

    timeSphere.updateOptions({ timezone: 'America/New_York' })
    expect(timeSphere.parse('2024-01-20 12:00:00').format('Z')).toMatch(/^-0[45]:00$/)
  })

  it('utc:true 时 parse / now 均为 UTC', function () {
    timeSphere.updateOptions({ utc: true })
    expect(timeSphere.parse('2024-01-20 12:00:00').format('Z')).toBe('+00:00')
    expect(timeSphere.now().format('Z')).toBe('+00:00')
  })
})

describe('dayjs 薄代理：走统一 parse', function () {
  it('format 缺省用 options.format；显式 format 优先', function () {
    expect(timeSphere.format('2024-01-20 14:30:45')).toBe('2024-01-20 14:30:45')
    expect(timeSphere.format('2024-01-20 14:30:45', 'YYYY年MM月DD日')).toBe(
      '2024年01月20日'
    )
  })

  it('add / subtract 对齐 dayjs 语义', function () {
    expect(timeSphere.add('2024-01-20', 1, 'day').format('YYYY-MM-DD')).toBe(
      '2024-01-21'
    )
    expect(timeSphere.subtract('2024-01-20', 1, 'day').format('YYYY-MM-DD')).toBe(
      '2024-01-19'
    )
  })

  it('compare / diff / isBetween', function () {
    expect(timeSphere.compare('2024-01-20', '2024-01-21', 'day')).toBe(-1)
    expect(timeSphere.compare('2024-01-20', '2024-01-20', 'day')).toBe(0)
    expect(timeSphere.compare('2024-01-21', '2024-01-20', 'day')).toBe(1)
    expect(timeSphere.diff('2024-01-22', '2024-01-20', 'day')).toBe(2)
    expect(
      timeSphere.isBetween('2024-01-21', '2024-01-20', '2024-01-22', 'day')
    ).toBe(true)
  })

  it('isValid / toTimestamp', function () {
    expect(timeSphere.isValid('2024-01-20')).toBe(true)
    expect(timeSphere.isValid('not-a-date')).toBe(false)
    expect(timeSphere.toTimestamp('2024-01-20 00:00:00')).toBe(
      timeSphere.parse('2024-01-20 00:00:00').valueOf()
    )
  })

  it('fromNow 相对 timeSphere.now()（非裸系统时钟文案随意性：用 withoutSuffix + 固定差）', function () {
    const past = timeSphere.subtract(timeSphere.now(), 2, 'day')
    const text = timeSphere.fromNow(past, true)
    expect(text).toMatch(/2/)
  })
})

describe('相对日：相对配置时区 now', function () {
  it('isToday / isTomorrow / isYesterday', function () {
    const today = timeSphere.now()
    expect(timeSphere.isToday(today)).toBe(true)
    expect(timeSphere.isTomorrow(timeSphere.add(today, 1, 'day'))).toBe(true)
    expect(timeSphere.isYesterday(timeSphere.subtract(today, 1, 'day'))).toBe(true)
    expect(timeSphere.isToday(timeSphere.add(today, 1, 'day'))).toBe(false)
  })
})

describe('域扩展 day：结构化日信息', function () {
  it('ofYear = 年内第几天；ofMonth = 月内日', function () {
    expect(timeSphere.day('2024-01-01', 'ofYear')).toBe(1)
    expect(timeSphere.day('2024-02-01', 'ofYear')).toBe(32)
    expect(timeSphere.day('2024-01-20', 'ofMonth')).toBe(20)
  })

  it('begin / final 为当日 startOf/endOf', function () {
    const begin = timeSphere.day('2024-01-20 15:30:00', 'begin')
    const final = timeSphere.day('2024-01-20 15:30:00', 'final')
    expect(begin.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-20 00:00:00')
    expect(final.format('YYYY-MM-DD')).toBe('2024-01-20')
    expect(final.hour()).toBe(23)
  })

  it('range 返回当日 begin/final 结构', function () {
    const range = timeSphere.day('2024-01-20', 'range')
    expect(range.begin.date).toBe('2024-01-20')
    expect(range.final.date).toBe('2024-01-20')
    expect(range.begin.day).toBe('20')
    expect(range.begin.dayOfWeek).toBe('星期六')
  })

  it('ranges 默认从 target 到月末；可指定 rangeEnd；含 isWeekend', function () {
    const days = timeSphere.day('2024-01-30', 'ranges')
    expect(days).toHaveLength(2)
    expect(days[0]?.date).toBe('2024-01-30')
    expect(days[1]?.date).toBe('2024-01-31')
    expect(days[0]?.isWeekend).toBe(false)
    expect(days[1]?.isWeekend).toBe(false)

    const span = timeSphere.day('2024-01-05', 'ranges', '2024-01-07')
    expect(span.map(function (d) {
      return d.date
    })).toEqual(['2024-01-05', '2024-01-06', '2024-01-07'])
    expect(span[1]?.isWeekend).toBe(true)
  })
})

describe('域扩展 month', function () {
  it('number / begin / final / range', function () {
    expect(timeSphere.month('2024-03-15', 'number')).toBe(3)
    expect(timeSphere.month('2024-03-15', 'begin').format('YYYY-MM-DD')).toBe(
      '2024-03-01'
    )
    expect(timeSphere.month('2024-03-15', 'final').format('YYYY-MM-DD')).toBe(
      '2024-03-31'
    )
    const range = timeSphere.month('2024-02-10', 'range')
    expect(range.daysInMonth).toBe(29)
    expect(range.begin.date).toBe('2024-02-01')
    expect(range.final.date).toBe('2024-02-29')
  })

  it('ranges 覆盖整月且 weekOfMonth 以周一起算', function () {
    const days = timeSphere.month('2024-01-15', 'ranges')
    expect(days).toHaveLength(31)
    expect(days[0]?.date).toBe('2024-01-01')
    // 2024-01-01 周一 → weekOfMonth 1
    expect(days[0]?.weekOfMonth).toBe(1)
    expect(days[0]?.dayOfWeek).toBe('星期一')
    // 2024-01-07 周日仍属第 1 周；01-08 周一进入第 2 周
    expect(days[6]?.weekOfMonth).toBe(1)
    expect(days[7]?.weekOfMonth).toBe(2)
  })
})

describe('域扩展 quarter', function () {
  it('number / begin / final / range / ranges / next', function () {
    expect(timeSphere.quarter('2024-05-01', 'number')).toBe(2)
    expect(timeSphere.quarter('2024-05-01', 'begin').format('YYYY-MM-DD')).toBe(
      '2024-04-01'
    )
    expect(timeSphere.quarter('2024-05-01', 'final').format('YYYY-MM-DD')).toBe(
      '2024-06-30'
    )

    const range = timeSphere.quarter('2024-05-01', 'range')
    expect(range.begin.quarter).toBe(2)
    expect(range.begin.date).toBe('2024-04-01')
    expect(range.final.date).toBe('2024-06-30')

    const months = timeSphere.quarter('2024-05-01', 'ranges')
    expect(months.map(function (m) {
      return m.month
    })).toEqual([4, 5, 6])

    const next = timeSphere.quarter('2024-05-01', 'next')
    expect(next).toEqual({
      begin: '2024-07-01',
      final: '2024-09-30',
      quarter: 3,
      year: 2024
    })
  })
})

describe('域扩展 year', function () {
  it('number / begin / final / range / ranges', function () {
    expect(timeSphere.year('2024-06-01', 'number')).toBe(2024)
    expect(timeSphere.year('2024-06-01', 'begin').format('YYYY-MM-DD')).toBe(
      '2024-01-01'
    )
    expect(timeSphere.year('2024-06-01', 'final').format('YYYY-MM-DD')).toBe(
      '2024-12-31'
    )

    const leap = timeSphere.year('2024-06-01', 'range')
    expect(leap.isLeapYear).toBe(true)
    expect(leap.daysInYear).toBe(366)

    const common = timeSphere.year('2023-06-01', 'range')
    expect(common.isLeapYear).toBe(false)
    expect(common.daysInYear).toBe(365)

    const months = timeSphere.year('2024-01-01', 'ranges')
    expect(months).toHaveLength(12)
    expect(months[0]?.month).toBe(1)
    expect(months[11]?.month).toBe(12)
    expect(months[0]?.quarter).toBe(1)
    expect(months[11]?.quarter).toBe(4)
  })
})
