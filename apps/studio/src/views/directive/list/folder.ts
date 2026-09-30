/**
 * 按「分组」分组（corex 指令库的 `folder` 列）。
 *
 * v13 起分组就是条目自己的一个字段，`null` = 未分组：不再有目录层级，
 * 也就不需要解析路径、更不会出现嵌套。
 */

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import type { DirectiveGroup } from './types'

/** 没有分组的那一组：key 与真实分组名不可能撞（分组名不给空串，见 directive.ts 的解析） */
const UNGROUPED_KEY = 'ungrouped'
const UNGROUPED_LABEL = '未分组'
const UNGROUPED_ICON = 'mdi:folder-remove-outline'

const FOLDER_ICON = 'mdi:folder-outline'

/** 分组名按拼音 / 字母排；同名数据每次进来的顺序都得一样，否则列表会自己跳 */
function compareFolders(a: string, b: string): number {
  return a.localeCompare(b, 'zh-Hans-CN')
}

function groupByFolder(entries: readonly DirectiveEntry[]): DirectiveGroup[] {
  const groups = new Map<string, DirectiveGroup>()

  entries.forEach(function (entry) {
    const key = entry.folder ?? UNGROUPED_KEY
    let group = groups.get(key)
    if (!group) {
      group = entry.folder
        ? { key, label: entry.folder, icon: FOLDER_ICON, items: [] }
        : { key, label: UNGROUPED_LABEL, icon: UNGROUPED_ICON, items: [] }
      groups.set(key, group)
    }
    group.items.push(entry)
  })

  const sorted = [...groups.values()]
    .filter(function (group) {
      return group.key !== UNGROUPED_KEY
    })
    .sort(function (a, b) {
      return compareFolders(a.label, b.label)
    })

  const ungrouped = groups.get(UNGROUPED_KEY)
  if (ungrouped) sorted.push(ungrouped)
  return sorted
}

export { UNGROUPED_ICON, UNGROUPED_KEY, UNGROUPED_LABEL, groupByFolder }
