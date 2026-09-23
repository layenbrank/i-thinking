import { usePanelRef } from '@i-thinking/design/components/resizable'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCorexStore } from '@/stores/corex'

import { RUN_SIZE, findSplitterState, writeSplitterOpen } from '../splitter'
import { indexStepCounts } from './run-status'

/**
 * 运行台的共享壳：卡片墙与编排台都要「底部一块能收起来的运行台」，
 * 开合存档、面板引用同步、选中哪条运行、一键执行后的自动展开都在这里，
 * 两个页面各自负责把 `ResizablePanel` 摆上去。
 *
 * corex 目录（动作表 + 指令表 + 未读标记）也在挂载时读一次：
 * 两个页面各有一份这个 hook，重复进页面由 store 自己挡住，不会重复发 IPC。
 *
 * 顺带带上动作库弹窗的开合：它跟运行台一样是页面外壳上的浮层，
 * 两页都要一份，放这儿省得各写一遍 state。
 *
 * 未读标记写的是宿主那侧的 `seenAt`，不是本地 state —— 卡片墙和编排台是两个页面，
 * 本地 state 一换页面就丢。
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

  /**
   * 开合只走它：本地状态与存档一起改。
   *
   * 只改本地状态的话，卡片墙里点「一键执行」把运行台摊开了，切到编排台又会是收起的
   * —— 两页各有自己的面板，存档是它们唯一的交点。
   */
  const setRunOpen = useCallback(function (next: boolean) {
    updateRunOpen(next)
    writeSplitterOpen({ isRunOpen: next })
  }, [])

  useEffect(
    function () {
      openRef.current = isRunOpen
    },
    [isRunOpen]
  )

  // 挂载后按存档开合一次：库的 `expand` 每次摊回上次宽度，收起是它自己的事
  useEffect(
    function () {
      const panel = runRef.current
      if (!panel) return
      if (openRef.current) panel.expand()
      else panel.collapse()
    },
    [runRef]
  )

  useEffect(
    function () {
      const panel = runRef.current
      if (!panel) return
      if (!isRunOpen) {
        panel.collapse()
        return
      }
      if (!panel.isCollapsed()) return

      panel.expand()
      // 从未展开过时 expand 会停在收起高度，强制拉回默认高
      if (panel.getSize().inPixels < RUN_SIZE) panel.resize(RUN_SIZE)
    },
    [isRunOpen, runRef]
  )

  const stepCounts = useMemo(
    function () {
      return indexStepCounts(directives)
    },
    [directives]
  )

  /** 起一条运行：新任务进运行台、自动摊开、顺手把这条指令标成已读 */
  const startRun = useCallback(
    function (name: string, input: Record<string, unknown>) {
      markSeen(name)
      setSelectedRunId(useCorexStore.getState().startRun(name, input))
      setRunOpen(true)
    },
    [markSeen, setRunOpen]
  )

  /**
   * 卡片上的一键执行：不带输入。
   *
   * corex 会先补指令自己声明的默认值，缺必填的把错误落进运行台 —— 比在这里先读一遍指令再拦下来
   * 少一次 IPC，也少一条「两处都判断必填」的分叉。
   */
  const quickRun = useCallback(
    function (name: string) {
      startRun(name, {})
    },
    [startRun]
  )

  function toggleRun() {
    setRunOpen(!isRunOpen)
  }

  /** 拖分栏也能收起运行台，拖动结果要跟存档对齐 */
  function onRunResize() {
    const nextOpen = !(runRef.current?.isCollapsed() ?? false)
    if (nextOpen === openRef.current) return
    openRef.current = nextOpen
    setRunOpen(nextOpen)
  }

  const runPanel = {
    isCollapsed: !isRunOpen,
    selectedId: selectedRunId,
    onToggle: toggleRun,
    onSelect: setSelectedRunId,
    onVisible: markSeen,
    onRemove: function (id: string) {
      useCorexStore.getState().removeRun(id)
      setSelectedRunId(function (selected) {
        return selected === id ? null : selected
      })
    },
    onClear: function () {
      useCorexStore.getState().clearRuns()
      // 清空后 `selectedRunId` 指向一条不存在的运行，运行台会停在空详情上
      setSelectedRunId(null)
    }
  }

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

/** 壳的形状：运行台分栏只要这一份类型，不必知道 hook 怎么实现 */
export type RunDock = ReturnType<typeof useRunDock>
