import { usePanelRef } from '@i-thinking/design/components/resizable'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCorexStore } from '@/stores/corex'

import { RUN_MAX, findSplitterState, writeSplitterOpen } from '../splitter'
import { indexStepCounts } from './run-status'

/**
 * 运行台开合卡顿的根因（与 CSS 动效无关）：
 * 1. expand/collapse 触发 Group `onLayoutChanged` → 同步 read/write localStorage
 * 2. 同帧 `onResize` 再打一轮 setState，Directive 整页（含卡片墙）重渲染
 * 3. expand + resize 连续两次改 flex，墙面双重回流
 *
 * 对策：程序化开合静音 onResize；布局存档只在用户拖拽时写；展开一次 resize 到 MAX；
 * runPanel 引用稳定，避免无谓重渲染。
 */

export function useRunDock() {
  const directives = useCorexStore(function (state) {
    return state.directives
  })
  const runs = useCorexStore(function (state) {
    return state.runs
  })
  const markSeen = useCorexStore(function (state) {
    return state.markSeen
  })
  const initialize = useCorexStore(function (state) {
    return state.initialize
  })

  useEffect(
    function () {
      void initialize()
    },
    [initialize]
  )

  const runRef = usePanelRef()
  const [initial] = useState(findSplitterState)
  const [isRunOpen, updateRunOpen] = useState(initial.isRunOpen)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [isLibraryOpen, updateLibraryOpen] = useState(false)

  const openRef = useRef(initial.isRunOpen)
  /** 程序化开合期间忽略 onResize，避免套娃 setState */
  const muteResizeRef = useRef(false)

  function persistOpen(next: boolean) {
    globalThis.queueMicrotask(function () {
      writeSplitterOpen({ isRunOpen: next })
    })
  }

  const setRunOpen = useCallback(function (next: boolean) {
    openRef.current = next
    updateRunOpen(next)
    persistOpen(next)
  }, [])

  function withMutedResize(task: () => void) {
    muteResizeRef.current = true
    try {
      task()
    } finally {
      globalThis.queueMicrotask(function () {
        muteResizeRef.current = false
      })
    }
  }

  function expandPanel() {
    const panel = runRef.current
    if (!panel) return
    withMutedResize(function () {
      // 一次到位：从收起直接拉到可用最大高度，避免 expand 再 resize 双回流
      panel.resize(RUN_MAX)
    })
  }

  function collapsePanel() {
    const panel = runRef.current
    if (!panel) return
    withMutedResize(function () {
      panel.collapse()
    })
  }

  // 挂载后按存档对齐一次
  useEffect(
    function () {
      if (openRef.current) expandPanel()
      else collapsePanel()
    },
    [runRef]
  )

  // 收起：先卸台体（isRunOpen=false），再缩面板
  useEffect(
    function () {
      if (isRunOpen) return
      collapsePanel()
    },
    [isRunOpen, runRef]
  )

  /** 分栏回流完成后再挂台体，避免同帧「改 flex + 挂 Chips/Output」抢主线程 */
  function openAfterResize() {
    globalThis.requestAnimationFrame(function () {
      setRunOpen(true)
    })
  }

  const startRun = useCallback(
    function (name: string, input: Record<string, unknown>) {
      markSeen(name)
      setSelectedRunId(useCorexStore.getState().startRun(name, input))
      // 点卡片「运行」只起任务，不掀开模拟终端；要看输出时用户自己展开标题栏
    },
    [markSeen]
  )

  const quickRun = useCallback(
    function (name: string) {
      startRun(name, {})
    },
    [startRun]
  )

  const toggleRun = useCallback(
    function () {
      if (openRef.current) {
        setRunOpen(false)
        return
      }
      expandPanel()
      openAfterResize()
    },
    [setRunOpen]
  )

  const onRunResize = useCallback(function () {
    if (muteResizeRef.current) return
    const nextOpen = !(runRef.current?.isCollapsed() ?? false)
    if (nextOpen === openRef.current) return
    setRunOpen(nextOpen)
  }, [setRunOpen, runRef])

  const onRemove = useCallback(function (id: string) {
    useCorexStore.getState().removeRun(id)
    setSelectedRunId(function (selected) {
      return selected === id ? null : selected
    })
  }, [])

  const onClear = useCallback(function () {
    useCorexStore.getState().clearRuns()
    setSelectedRunId(null)
  }, [])

  const stepCounts = useMemo(
    function () {
      return indexStepCounts(directives)
    },
    [directives]
  )

  const runPanel = useMemo(
    function () {
      return {
        isCollapsed: !isRunOpen,
        selectedId: selectedRunId,
        onToggle: toggleRun,
        onSelect: setSelectedRunId,
        onVisible: markSeen,
        onRemove,
        onClear
      }
    },
    [isRunOpen, selectedRunId, toggleRun, markSeen, onRemove, onClear]
  )

  return {
    runs,
    stepCounts,
    runRef,
    runPanel,
    isRunOpen,
    startRun,
    quickRun,
    onRunResize,
    isLibraryOpen,
    updateLibraryOpen
  }
}

export type RunDock = ReturnType<typeof useRunDock>
