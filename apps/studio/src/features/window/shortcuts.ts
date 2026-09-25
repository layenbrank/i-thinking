import { useEffect, useRef } from 'react'

/**
 * 窗口级快捷键。
 *
 * 按键取自 Qoder 的官方快捷键表，只留**我们真能实现**的那几条：语音、新建窗口、
 * 问题反馈那些在 studio 里没有对应能力，不写进表里 —— 免得设置页列出一堆按了没反应的组合键。
 *
 * 表和键盘处理共用同一份定义（按 id 派发），所以不可能出现「文档写 ⌘B、代码听 ⌘K」这种漂移。
 */

const WINDOW_SHORTCUTS = [
  { id: 'toggle-sidebar', label: '打开或关闭左侧栏', key: 'b', shift: false },
  { id: 'toggle-aside', label: '打开或关闭右侧栏', key: 'b', shift: true },
  { id: 'new-task', label: '新任务', key: 'n', shift: false },
  { id: 'search-threads', label: '搜索任务', key: 'f', shift: false },
  { id: 'cycle-model', label: '切换到下一个模型', key: '/', shift: false },
  { id: 'open-settings', label: '设置', key: ',', shift: false }
] as const

type WindowShortcutID = (typeof WINDOW_SHORTCUTS)[number]['id']

/** macOS 用 ⌘，其余用 Ctrl（与 Qoder 的按键表一致） */
function findModifierLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl'
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'
}

/** 把按键渲染成人看的样子，如 `⌘ + Shift + B` */
function formatShortcut(item: (typeof WINDOW_SHORTCUTS)[number]): string {
  const parts = [findModifierLabel()]
  if (item.shift) parts.push('Shift')
  parts.push(item.key === ',' ? ',' : item.key.toUpperCase())
  return parts.join(' + ')
}

function findShortcutKey(event: KeyboardEvent): WindowShortcutID | null {
  if (!event.metaKey && !event.ctrlKey) return null
  // Alt 组合留给系统/输入法，不抢
  if (event.altKey) return null

  const char = event.key.toLowerCase()
  const match = WINDOW_SHORTCUTS.find(function (item) {
    return item.key === char && item.shift === event.shiftKey
  })

  return match ? match.id : null
}

type WindowShortcutHandlers = {
  [id in WindowShortcutID]: () => void
}

/**
 * 绑定快捷键。处理函数放在 ref 里，所以调用方不必为了稳定引用去包 `useMemo` ——
 * 键盘监听本身只挂一次。
 */
function useWindowShortcuts(handlers: WindowShortcutHandlers): void {
  const latest = useRef(handlers)

  useEffect(
    function () {
      latest.current = handlers
    },
    [handlers]
  )

  useEffect(function () {
    function onKeyDown(event: KeyboardEvent) {
      const id = findShortcutKey(event)
      if (!id) return
      // 这些组合键在浏览器/编辑器里都有默认行为（如 ⌘F 查找），不拦会双触发
      event.preventDefault()
      latest.current[id]()
    }

    window.addEventListener('keydown', onKeyDown)
    return function () {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}

export { WINDOW_SHORTCUTS, findModifierLabel, formatShortcut, useWindowShortcuts }
export type { WindowShortcutID, WindowShortcutHandlers }
