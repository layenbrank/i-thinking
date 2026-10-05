import { create } from 'zustand'

import { findSplitterState, writeSplitterOpen } from '../splitter'

/**
 * 卡片墙与编排台共用的运行台 UI 态。
 * 两页各自挂 `useRunDock`，但开合 / 选中 tab 必须跟这份走，否则切路由会各记各的。
 */
interface RunDockStore {
  isRunOpen: boolean
  selectedRunId: string | null
  /** 席位复用会换 id，靠名字把选中钉在同一枚标签上 */
  selectedName: string | null
  isLibraryOpen: boolean
  writeRunOpen: (next: boolean) => void
  selectRun: (id: string | null, name?: string | null) => void
  writeLibraryOpen: (next: boolean) => void
}

const useRunDockStore = create<RunDockStore>(function (setter) {
  const initial = findSplitterState()
  return {
    isRunOpen: initial.isRunOpen,
    selectedRunId: null,
    selectedName: null,
    isLibraryOpen: false,

    writeRunOpen(next) {
      setter({ isRunOpen: next })
      globalThis.queueMicrotask(function () {
        writeSplitterOpen({ isRunOpen: next })
      })
    },

    selectRun(id, name) {
      if (id === null) {
        setter({ selectedRunId: null, selectedName: null })
        return
      }
      if (name !== undefined) setter({ selectedRunId: id, selectedName: name })
      else setter({ selectedRunId: id })
    },

    writeLibraryOpen(next) {
      setter({ isLibraryOpen: next })
    }
  }
})

export { useRunDockStore }
