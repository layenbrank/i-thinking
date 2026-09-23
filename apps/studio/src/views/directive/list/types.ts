/** 指令列表的渲染侧类型（由 corex 目录 + 运行记录折叠而来，纯展示） */

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

/** 列表里的一组指令：按分类分，或按最近执行的时间带分 */
interface DirectiveGroup {
  /** 分组标识（分类名 / 时间带名），参与 React key */
  key: string
  label: string
  icon: string
  items: DirectiveEntry[]
}

export type { DirectiveGroup }
