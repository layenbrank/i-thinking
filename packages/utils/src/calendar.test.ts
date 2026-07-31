import { afterEach, describe, expect, it } from 'vitest'

import { calendar } from './calendar'
import { timeSphere } from './time-sphere'

const RESET_OPTIONS = {
  timezone: 'Asia/Shanghai',
  locale: 'zh-cn',
  format: 'YYYY-MM-DD HH:mm:ss',
  utc: false
} as const

afterEach(function () {
  timeSphere.updateOptions({ ...RESET_OPTIONS })
})

describe('count：天数矩阵', function () {
  it('solar day/month/year', function () {
    expect(calendar.count('2024-02-01', 'day', 'solar')).toBe(1)
    expect(calendar.count('2024-02-01', 'month', 'solar')).toBe(29)
    expect(calendar.count('2024-01-01', 'year', 'solar')).toBe(366)
    expect(calendar.count('2023-01-01', 'year', 'solar')).toBe(365)
  })

  it('lunar day/month/year', function () {
    expect(calendar.count('2024-02-10', 'day', 'lunar')).toBe(1)
    expect(calendar.count('2024-02-10', 'month', 'lunar')).toBe(29)
    expect(calendar.count('2024-02-10', 'year', 'lunar')).toBe(354)
  })
})

describe('单日分层：legal / lunar / solar / term', function () {
  it('legalHoliday / lunarFestival / solarFestival / term', function () {
    expect(calendar.legalHoliday('2024-01-01')).toEqual({
      name: '元旦',
      type: 'legal',
      date: '2024-01-01'
    })
    expect(calendar.lunarFestival('2024-02-10')?.name).toBe('春节')
    expect(calendar.solarFestival('2024-01-01')?.name).toBe('元旦')
    expect(calendar.term('2024-02-04')).toBe('立春')
    expect(calendar.term('2024-02-03')).toBeNull()
    expect(calendar.legalHoliday('2024-02-03')).toBeNull()
  })
})

describe('摘要优先级与 festivals', function () {
  it('festival：legal > lunar > solar > term', function () {
    expect(calendar.festival('2024-01-01')).toBe('元旦')
    expect(calendar.festival('2024-02-10')).toBe('春节')
    expect(calendar.festival('2024-02-09')).toBe('除夕')
    expect(calendar.festival('2025-01-28')).toBe('春节')
    expect(calendar.festival('2024-02-03')).toBeNull()
  })

  it('festivals 单日：法定不与同名 solar 重复；节气 type=term', function () {
    const newYear = calendar.festivals('2024-01-01')
    expect(newYear).toEqual([{ name: '元旦', type: 'legal', date: '2024-01-01' }])

    const lichun = calendar.festivals('2024-02-04')
    expect(
      lichun.some(function (item) {
        return item.type === 'legal' && item.name === '春节'
      })
    ).toBe(true)
    expect(
      lichun.some(function (item) {
        return item.type === 'term' && item.name === '立春'
      })
    ).toBe(true)
    expect(
      lichun.every(function (item) {
        return item.type !== 'solar' || item.name !== '春节'
      })
    ).toBe(true)
  })

  it('festivals 区间 + enumable:false 压缩法定连休', function () {
    const allLegal = calendar.festivals('2026-02-14', '2026-02-23').filter(function (item) {
      return item.type === 'legal' && item.name === '春节'
    })
    // console.log('allLegal ===>', allLegal)
    expect(allLegal.length).toBe(10)

    const firstOnly = calendar.festivals('2026-02-14', '2026-02-23', false).filter(function (item) {
      return item.type === 'legal' && item.name === '春节'
    })
    // console.log('firstOnly ===>', firstOnly)
    expect(firstOnly).toEqual([{ name: '春节', type: 'legal', date: '2026-02-14' }])
  })

  it('节日个数可用 festivals.length', function () {
    expect(calendar.festivals('2024-02-10').length).toBeGreaterThan(0)
    expect(calendar.festivals('2024-02-03').length).toBe(0)
  })
})

describe('nextFestival', function () {
  it('从次日找到下一节日且 distance 正确', function () {
    expect(calendar.nextFestival('2024-02-09')).toEqual({
      name: '春节',
      distance: 1
    })
  })
})

describe('干支与农历 format', function () {
  it('sixtyCycle 按农历日所属年（正月初一切换）', function () {
    expect(calendar.sixtyCycle('2024-02-09')).toMatchObject({
      heavenStem: '癸',
      earthBranch: '卯',
      zodiac: '兔'
    })
    expect(calendar.sixtyCycle('2024-02-10')).toMatchObject({
      heavenStem: '甲',
      earthBranch: '辰',
      zodiac: '龙'
    })
  })

  it('lunarDay 生肖与 sixtyCycle 一致；宜忌用顿号', function () {
    const info = calendar.lunarDay('2024-02-10')
    expect(info.zodiac).toBe(calendar.sixtyCycle('2024-02-10').zodiac)
    expect(info.festival).toBe('春节')
    expect(info.unbeneficial.includes(',')).toBe(false)
  })

  it('format 默认农历模板', function () {
    expect(calendar.format('2024-02-10')).toBe('二〇二四年 正月初一')
  })
})

describe('festivalsBy', function () {
  it('solar month 枚举非空；lunar day 春节', function () {
    const solarMonth = calendar.festivalsBy('2024-01-15', 'month', 'solar')
    expect(Array.isArray(solarMonth)).toBe(true)
    expect((solarMonth as { festival: string }[]).length).toBeGreaterThan(0)

    expect(calendar.festivalsBy('2024-02-10', 'day', 'lunar')).toEqual({
      festival: '春节',
      lunar: '2024-1-1'
    })
  })
})
