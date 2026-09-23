/**
 * 列表的排序与分组。
 *
 * 两种看问题的角度：按分类找功能，按最近执行找「刚在弄的那条」。分组规则是**数据**而不是
 * 分支 —— 每种排序一个函数，按模式从表里取；加一种排序只需再补一行。
 */

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import { DAY_MS, HOUR_MS, WEEK_MS, type DirectiveRuns } from '../run/run-status'
import { groupByBucket } from './bucket'
import type { DirectiveGroup } from './types'

const SORT_MODES = ['BUCKET', 'RECENT'] as const

type SortMode = (typeof SORT_MODES)[number]

const DEFAULT_SORT: SortMode = 'BUCKET'

const SORT_LABELS: Record<SortMode, string> = {
  BUCKET: '分类',
  RECENT: '最近执行'
}

const SORT_ICONS: Record<SortMode, string> = {
  BUCKET: 'mdi:folder-outline',
  RECENT: 'mdi:history'
}

const STORAGE_KEY = 'studio.directive.sort'

/** 时间带从近到远；带外还有「更早」与「未运行」两组收尾 */
const RECENCY_BANDS = [
  { key: 'hour', label: '最近 1 小时', icon: 'mdi:clock-fast', within: HOUR_MS },
  { key: 'day', label: '最近 24 小时', icon: 'mdi:clock-outline', within: DAY_MS },
  { key: 'week', label: '最近 7 天', icon: 'mdi:calendar-week-outline', within: WEEK_MS }
] as const

const EARLIER_BAND = { key: 'earlier', label: '更早', icon: 'mdi:calendar-blank-outline' }
const NEVER_BAND = { key: 'never', label: '未运行', icon: 'mdi:square-outline' }

const BANDS = [...RECENCY_BANDS, EARLIER_BAND, NEVER_BAND]

type Grouper = (
  entries: readonly DirectiveEntry[],
  summaries: Record<string, DirectiveRuns>,
  now: number
) => DirectiveGroup[]

function bandKeyOf(age: number): string {
  const band = RECENCY_BANDS.find(function (item) {
    return age <= item.within
  })
  return band ? band.key : EARLIER_BAND.key
}

/** 按「最近一次运行」分带，带内按时间倒序 —— 刚跑过的排最上面 */
function groupByRecency(
  entries: readonly DirectiveEntry[],
  summaries: Record<string, DirectiveRuns>,
  now: number
): DirectiveGroup[] {
  const byBand: Record<string, DirectiveEntry[]> = {}
  BANDS.forEach(function (band) {
    byBand[band.key] = []
  })

  function lastAtOf(entry: DirectiveEntry): number {
    return summaries[entry.name]?.lastAt?.getTime() ?? 0
  }

  entries.forEach(function (entry) {
    const at = summaries[entry.name]?.lastAt
    byBand[at ? bandKeyOf(now - at.getTime()) : NEVER_BAND.key].push(entry)
  })

  return BANDS.map(function (band) {
    const items = byBand[band.key].sort(function (a, b) {
      return lastAtOf(b) - lastAtOf(a)
    })
    return { key: band.key, label: band.label, icon: band.icon, items }
  }).filter(function (group) {
    return group.items.length > 0
  })
}

const GROUPERS: Record<SortMode, Grouper> = {
  BUCKET: function (entries) {
    return groupByBucket(entries)
  },
  RECENT: groupByRecency
}

function groupDirectives(
  entries: readonly DirectiveEntry[],
  summaries: Record<string, DirectiveRuns>,
  mode: SortMode,
  now: number = Date.now()
): DirectiveGroup[] {
  return GROUPERS[mode](entries, summaries, now)
}

/** 存档损坏 / 旧版本写下的值一律回落默认，不猜 */
function parseSortMode(raw: string | null): SortMode {
  return SORT_MODES.includes(raw as SortMode) ? (raw as SortMode) : DEFAULT_SORT
}

function findSortMode(): SortMode {
  if (typeof localStorage === 'undefined') return DEFAULT_SORT
  return parseSortMode(localStorage.getItem(STORAGE_KEY))
}

function writeSortMode(mode: SortMode): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, mode)
}

export {
  SORT_ICONS,
  SORT_LABELS,
  SORT_MODES,
  findSortMode,
  groupDirectives,
  parseSortMode,
  writeSortMode
}
export type { SortMode }
