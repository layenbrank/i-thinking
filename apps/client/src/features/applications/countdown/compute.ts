import dayjs, { type Dayjs } from 'dayjs'

type WorkStatus = 'before' | 'working' | 'after' | 'rest'

interface Computed {
  status: WorkStatus
  countdown: string
  progress: number
  elapsedSeconds: number
  totalWorkSeconds: number
  todayEarned: number
  dailySalary: number
  daysUntilPayday: number
  isPayday: boolean
  paydayDate: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatDuration(totalSeconds: number) {
  const secs = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function parseTimeStr(time: string): [number, number] {
  const [h, m] = time.split(':').map(Number)
  return [h || 0, m || 0]
}

function buildTimeOnDate(base: Dayjs, time: string) {
  const [h, m] = parseTimeStr(time)
  return base.hour(h).minute(m).second(0).millisecond(0)
}

function getWorkingDaysInMonth(year: number, month: number, workDays: number[]) {
  const daysInMonth = dayjs(new Date(year, month, 1)).daysInMonth()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = dayjs(new Date(year, month, d)).day()
    const iso = dow === 0 ? 7 : dow
    if (workDays.includes(iso)) count++
  }
  return Math.max(1, count)
}

function findDayOfWeekISO(d: Dayjs) {
  const dow = d.day()
  return dow === 0 ? 7 : dow
}

function clampDayToMonth(base: Dayjs, day: number) {
  return base.date(Math.min(day, base.daysInMonth()))
}

function parseWorkDays(workDays: string): number[] {
  try {
    return JSON.parse(workDays) as number[]
  } catch {
    return [1, 2, 3, 4, 5]
  }
}

function compute(
  now: Dayjs,
  workStart: string,
  workEnd: string,
  workDays: number[],
  monthlySalary: number,
  payDay: number
): Computed {
  const isoDay = findDayOfWeekISO(now)
  const isWorkDay = workDays.includes(isoDay)

  const startTime = buildTimeOnDate(now, workStart)
  const endTime = buildTimeOnDate(now, workEnd)
  const totalWorkSeconds = Math.max(1, endTime.diff(startTime, 'second'))

  let status: WorkStatus
  let countdown = '00:00:00'
  let progress = 0
  let elapsedSeconds = 0

  if (!isWorkDay) {
    status = 'rest'
  } else if (now.isBefore(startTime)) {
    status = 'before'
    countdown = formatDuration(startTime.diff(now, 'second'))
  } else if (now.isBefore(endTime) || now.isSame(endTime)) {
    status = 'working'
    elapsedSeconds = now.diff(startTime, 'second')
    const remaining = endTime.diff(now, 'second')
    countdown = formatDuration(remaining)
    progress = Math.min(100, (elapsedSeconds / totalWorkSeconds) * 100)
  } else {
    status = 'after'
    progress = 100
    elapsedSeconds = totalWorkSeconds
  }

  let todayEarned = 0
  const workingDays = getWorkingDaysInMonth(now.year(), now.month(), workDays)
  const dailySalary = monthlySalary > 0 ? monthlySalary / workingDays : 0
  if (monthlySalary > 0 && (status === 'working' || status === 'after') && isWorkDay) {
    todayEarned = (Math.min(elapsedSeconds, totalWorkSeconds) / totalWorkSeconds) * dailySalary
  }

  const today = now.date()
  let daysUntilPayday = 0
  let isPayday = false
  let paydayDate = ''

  const clampedThisMonth = clampDayToMonth(now, payDay)
  const effectivePayDayThisMonth = clampedThisMonth.date()

  if (today === effectivePayDayThisMonth) {
    isPayday = true
    paydayDate = clampedThisMonth.format('MM月DD日')
  } else if (today < effectivePayDayThisMonth) {
    daysUntilPayday = clampedThisMonth.diff(now.startOf('day'), 'day')
    paydayDate = clampedThisMonth.format('MM月DD日')
  } else {
    const target = clampDayToMonth(now.add(1, 'month'), payDay)
    daysUntilPayday = target.diff(now.startOf('day'), 'day')
    paydayDate = target.format('MM月DD日')
  }

  return {
    status,
    countdown,
    progress,
    elapsedSeconds,
    totalWorkSeconds,
    todayEarned,
    dailySalary,
    daysUntilPayday,
    isPayday,
    paydayDate
  }
}

const STATUS_LABEL: Record<WorkStatus, string> = {
  before: '距上班',
  working: '距下班',
  after: '已下班',
  rest: '休息日'
}

export {
  compute,
  formatDuration,
  parseWorkDays,
  parseTimeStr,
  buildTimeOnDate,
  STATUS_LABEL
}
export type { WorkStatus, Computed }
