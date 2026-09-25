import { createContext, useContext } from 'react'

/**
 * 右栏的开合通道。
 *
 * 开合状态本身在 `chat.tsx`（三栏布局的所有者，栏宽与开合都要落 localStorage），
 * 这里只把它下发一次，让消息流里的组件（如变更汇总卡的「审阅」）也能开右栏 ——
 * 不引全局 store，也不用 DOM 事件。
 *
 * 没有 Provider 时全部退化成 no-op：单独渲染某个组件不会炸。
 *
 * 与 Provider 分在两个文件：`.tsx` 里混着导出 hook 与常量会破坏 fast refresh 的边界。
 */

/**
 * 右栏的段落 id，同时也是滚动定位的锚点（与 `AsideCard` 上的 `data-aside-section` 一一对应）。
 * 段落的**顺序**由 `aside.tsx` 决定，这里只管有哪些 id。
 */
export type AsideSection =
  | 'run'
  | 'plan'
  | 'changes'
  | 'references'
  | 'tools'
  | 'usage'
  | 'quota'
  | 'model'
  | 'workspace'
  | 'session'

export interface AsidePanelValue {
  isOpen: boolean
  /** 待滚动到的段落；右栏滚过去后调 `clearFocus` 摘掉，避免重复滚动 */
  focus: AsideSection | null
  open: (focus?: AsideSection) => void
  close: () => void
  toggle: () => void
  clearFocus: () => void
}

function noop(): void {
  return undefined
}

const NO_PROVIDER: AsidePanelValue = {
  isOpen: false,
  focus: null,
  open: noop,
  close: noop,
  toggle: noop,
  clearFocus: noop
}

export const AsidePanelContext = createContext<AsidePanelValue | null>(null)

export function useAsidePanel(): AsidePanelValue {
  return useContext(AsidePanelContext) ?? NO_PROVIDER
}
