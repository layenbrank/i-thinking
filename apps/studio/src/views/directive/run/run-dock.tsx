import { ResizablePanel } from '@i-thinking/design/components/resizable'

import ActionLibraryDialog from '@/views/directive/action-library'

import { RUN_COLLAPSED, RUN_ID, RUN_MAX, RUN_MIN, RUN_SIZE } from '../splitter'
import RunPanel from './run-panel'
import type { RunDock } from './use-run-dock'

/**
 * 底部的运行台分栏：卡片墙与编排台共用它的形状。
 *
 * 两个页面各有一份 `useRunDock`（台面状态跟页面走），但分栏本身只该有一处定义 ——
 * 尺寸档位、放下时的 48px、拖分栏后的状态对齐，写两遍就一定会各自漂移。
 *
 * 动作库弹框跟这块走：它由运行台那侧的按钮打开，本体是 portal，摆在面板里不影响分栏布局。
 */

interface Props {
  dock: RunDock
}

function RunDockPanel(props: Props) {
  const { dock } = props

  return (
    <ResizablePanel
      id={RUN_ID}
      panelRef={dock.runRef}
      defaultSize={RUN_SIZE}
      minSize={RUN_MIN}
      maxSize={RUN_MAX}
      collapsible
      collapsedSize={RUN_COLLAPSED}
      groupResizeBehavior="preserve-pixel-size"
      onResize={dock.onRunResize}
      className="min-h-0">
      <RunPanel
        runs={dock.runs}
        stepCounts={dock.stepCounts}
        {...dock.runPanel}
      />
      <ActionLibraryDialog
        open={dock.isLibraryOpen}
        onOpenChange={dock.updateLibraryOpen}
      />
    </ResizablePanel>
  )
}

export { RunDockPanel }
