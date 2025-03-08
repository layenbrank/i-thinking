/**
 * 日期时间服务使用示例
 * @description 展示日期时间服务的各种使用场景和功能。
 * @packageDocumentation
 */

import type { Dayjs, ConfigType } from 'dayjs'
import {
  dateTimeService,
  type IWorkdayStrategy,
  DefaultWorkdayStrategy,
  type DateTimeConfig
} from '../date-time-service'

/**
 * 基本使用示例
 */
async function basicExample() {
  console.log('\n=== 基本使用示例 ===')

  // 1. 获取当前时间
  const now = dateTimeService.now()
  console.log('当前时间:', dateTimeService.format(now))

  // 2. 日期解析和格式化
  const date = dateTimeService.parse('2024-01-20')
  console.log('基本格式化:', dateTimeService.format(date))
  console.log('自定义格式:', dateTimeService.format(date, 'YYYY年MM月DD日'))
  console.log('时间格式:', dateTimeService.format(date, 'HH:mm:ss'))
  console.log('带毫秒:', dateTimeService.format(date, 'YYYY-MM-DD HH:mm:ss.SSS'))
  console.log('带时区:', dateTimeService.format(date, 'YYYY-MM-DD HH:mm:ss Z'))

  // 3. 相对时间
  const pastDate = dateTimeService.subtract(now, 1, 'day')
  console.log('相对时间:', dateTimeService.fromNow(pastDate))
}

/**
 * 日期计算示例
 */
async function calculationExample() {
  console.log('\n=== 日期计算示例 ===')

  const now = dateTimeService.now()

  // 1. 添加时间
  console.log('一天后:', dateTimeService.format(dateTimeService.add(now, 1, 'day')))
  console.log('一周后:', dateTimeService.format(dateTimeService.add(now, 7, 'day')))
  console.log('一个月后:', dateTimeService.format(dateTimeService.add(now, 1, 'month')))

  // 2. 减少时间
  console.log('一天前:', dateTimeService.format(dateTimeService.subtract(now, 1, 'day')))
  console.log('一周前:', dateTimeService.format(dateTimeService.subtract(now, 7, 'day')))
  console.log('一个月前:', dateTimeService.format(dateTimeService.subtract(now, 1, 'month')))

  // 3. 计算时间差
  const futureDate = dateTimeService.add(now, 1, 'month')
  console.log('相差天数:', dateTimeService.diff(futureDate, now, 'day'))
  console.log('相差小时:', dateTimeService.diff(futureDate, now, 'hour'))
  console.log('相差分钟:', dateTimeService.diff(futureDate, now, 'minute'))
}

/**
 * 日期比较示例
 */
async function comparisonExample() {
  console.log('\n=== 日期比较示例 ===')

  const date1 = dateTimeService.parse('2024-01-20')
  const date2 = dateTimeService.parse('2024-01-21')

  // 1. 比较大小
  console.log('日期比较:', dateTimeService.compare(date1, date2)) // -1 表示 date1 早于 date2

  // 2. 检查是否在范围内
  const targetDate = dateTimeService.parse('2024-01-20 12:00:00')
  console.log(
    '是否在范围内:',
    dateTimeService.isBetween(
      targetDate,
      dateTimeService.parse('2024-01-20 00:00:00'),
      dateTimeService.parse('2024-01-20 23:59:59')
    )
  )
}

/**
 * 工作日处理示例
 */
async function workdayExample() {
  console.log('\n=== 工作日示例 ===')

  // 1. 基本工作日判断
  console.log('周一是否工作日:', dateTimeService.workday.isWorkday('2025-01-20')) // true
  console.log('周六是否工作日:', dateTimeService.workday.isWorkday('2025-01-19')) // false

  // 2. 获取下一个工作日
  console.log(
    '周五的下一个工作日:',
    dateTimeService.format(dateTimeService.workday.nextWorkday('2024-01-19'))
  ) // 2024-01-22 (下周一)

  // 3. 计算工作日天数
  console.log(
    '一月份工作日数量:',
    dateTimeService.workday.countWorkdays('2024-01-01', '2024-01-31')
  )

  // 4. 自定义工作日策略
  class CustomWorkdayStrategy extends DefaultWorkdayStrategy {
    private holidays = new Set(['2024-01-01', '2024-02-10']) // 法定节假日
    private workdays = new Set(['2024-02-04']) // 调休工作日

    override isWorkday(targetDate: ConfigType): boolean {
      const dateStr = dateTimeService.format(targetDate, 'YYYY-MM-DD')
      if (this.holidays.has(dateStr)) return false
      if (this.workdays.has(dateStr)) return true
      return super.isWorkday(targetDate)
    }
  }

  // 应用自定义策略
  await dateTimeService.updateConfig({
    workdayStrategy: new CustomWorkdayStrategy()
  })
}

/**
 * 日期信息示例
 */
async function dateInfoExample() {
  console.log('\n=== 日期信息示例 ===')

  const date = '2025-01-20'

  // 1. 获取日期信息
  console.log('月份中的第几天:', dateTimeService.date.getDayOfMonth(date)) // 20
  console.log('年份中的第几天:', dateTimeService.date.getDayOfYear(date)) // 20
  console.log('月份中的第几周:', dateTimeService.date.getWeekOfMonth(date)) // 3

  // 2. 获取星期几（多种格式）
  console.log('数字格式:', dateTimeService.date.getDayOfWeek(date, 'number')) // 6
  console.log('中文简写:', dateTimeService.date.getDayOfWeek(date, 'cn')) // 周六
  console.log('中文全称:', dateTimeService.date.getDayOfWeek(date, 'cnLong')) // 星期六
  console.log('英文简写:', dateTimeService.date.getDayOfWeek(date, 'en')) // Sat
  console.log('英文全称:', dateTimeService.date.getDayOfWeek(date, 'enLong')) // Saturday

  // 3. 日期状态判断
  console.log('是否周末:', dateTimeService.date.isWeekend(date))
  console.log('是否今天:', dateTimeService.date.isToday(date))

  // 4. 获取日期的开始和结束时间
  console.log('日期开始:', dateTimeService.format(dateTimeService.date.startOfDay(date)))
  console.log('日期结束:', dateTimeService.format(dateTimeService.date.endOfDay(date)))
}

/**
 * 季度处理示例
 */
async function quarterExample() {
  console.log('\n=== 季度示例 ===')

  const date = '2024-01-20'

  // 1. 获取季度
  console.log('当前季度:', dateTimeService.quarter.get(date)) // 1

  // 2. 获取季度的开始和结束
  console.log('季度开始:', dateTimeService.format(dateTimeService.quarter.startOf(date)))
  console.log('季度结束:', dateTimeService.format(dateTimeService.quarter.endOf(date)))

  // 3. 季度范围处理
  const quarterStart = dateTimeService.quarter.startOf(date)
  const quarterEnd = dateTimeService.quarter.endOf(date)

  // 判断日期是否在当前季度
  const isInCurrentQuarter = (targetDate: string) => {
    return dateTimeService.isBetween(targetDate, quarterStart, quarterEnd)
  }

  console.log('2024-02-15 是否在第一季度:', isInCurrentQuarter('2024-02-15'))
}

/**
 * 周处理示例
 */
async function weekExample() {
  console.log('\n=== 周处理示例 ===')

  const date = dateTimeService.now()

  // 1. 中文环境（周一为起始日）
  await dateTimeService.updateConfig({ locale: 'zh-cn' })
  console.log('\n[中文环境 - 周一到周日]')
  console.log('当前周数:', dateTimeService.week.get(date))
  console.log('周开始:', dateTimeService.format(dateTimeService.week.startOf(date)))
  console.log('周结束:', dateTimeService.format(dateTimeService.week.endOf(date)))

  // 获取本周所有日期（中文）
  const getChineseWeekDates = (targetDate: string) => {
    const start = dateTimeService.week.startOf(targetDate)
    return Array.from({ length: 7 }, (_, i) => {
      return dateTimeService.add(start, i, 'day')
    })
  }

  console.log(
    '本周所有日期 (中文):',
    getChineseWeekDates(dateTimeService.format(date, 'YYYY-MM-DD')).map(d => ({
      date: dateTimeService.format(d, 'MM-DD'),
      weekday: dateTimeService.date.getDayOfWeek(d, 'cn')
    }))
  )

  // 2. 英文环境（周日为起始日）
  await dateTimeService.updateConfig({ locale: 'en' })
  console.log('\n[英文环境 - 周日到周六]')
  console.log('当前周数:', dateTimeService.week.get(date))
  console.log('周开始:', dateTimeService.format(dateTimeService.week.startOf(date)))
  console.log('周结束:', dateTimeService.format(dateTimeService.week.endOf(date)))

  // 获取本周所有日期（英文）
  const getEnglishWeekDates = (targetDate: string) => {
    const start = dateTimeService.week.startOf(targetDate)
    return Array.from({ length: 7 }, (_, i) => {
      return dateTimeService.add(start, i, 'day')
    })
  }

  console.log(
    '本周所有日期 (英文):',
    getEnglishWeekDates(dateTimeService.format(date, 'YYYY-MM-DD')).map(d => ({
      date: dateTimeService.format(d, 'MM-DD'),
      weekday: dateTimeService.date.getDayOfWeek(d, 'en')
    }))
  )

  // 3. 对比中英文区别
  console.log('\n[中英文区别对比]')
  console.log('- 中文：周一到周日，本周范围：01-06 到 01-12')
  console.log('- 英文：周日到周六，本周范围：01-05 到 01-11')

  // 恢复中文环境
  await dateTimeService.updateConfig({ locale: 'zh-cn' })
}

/**
 * 配置示例
 */
async function configExample() {
  console.log('\n=== 配置示例 ===')

  // 1. 更新时区和语言
  const config: DateTimeConfig = {
    timezone: 'America/New_York',
    locale: 'en',
    format: 'MM/DD/YYYY HH:mm:ss'
  }
  await dateTimeService.updateConfig(config)
  console.log('纽约时间:', dateTimeService.format(dateTimeService.now()))

  // 2. 恢复默认配置
  await dateTimeService.updateConfig({
    timezone: 'Asia/Shanghai',
    locale: 'zh-cn',
    format: 'YYYY-MM-DD HH:mm:ss'
  })
  console.log('上海时间:', dateTimeService.format(dateTimeService.now()))
}

/**
 * 运行所有示例
 */
export async function runExamples() {
  try {
    await basicExample()
    await calculationExample()
    await comparisonExample()
    await workdayExample()
    await dateInfoExample()
    await quarterExample()
    await weekExample()
    await configExample()
  } catch (error) {
    console.error('示例运行错误:', error)
  }
}

// 运行示例
// runExamples().catch(console.error)
