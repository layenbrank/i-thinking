import { useMorphStore } from '@/stores/morph.ts'
import { clsx } from 'clsx'
import styles from './statusbar.module.scss'

const TOOL_LABELS: Record<Morph.Tool, string> = {
  select: '选择',
  text: '文本',
  highlight: '高亮',
  shape: '形状',
  stamp: '签章',
  crop: '裁剪',
  rotate: '旋转'
}

export default function StatusBar() {
  const activeTool = useMorphStore((s) => s.activeTool)
  const zoom = useMorphStore((s) => s.zoom)
  const selectedId = useMorphStore((s) => s.selectedAnnotationId)
  const undoCount = useMorphStore((s) => s.undoStack.length)
  const redoCount = useMorphStore((s) => s.redoStack.length)

  const selectionLabel = selectedId ? '已选中对象' : '未选中对象'

  return (
    <div className={clsx([styles.statusbar])}>
      <span className={styles.left}>
        就绪 · 工具: {TOOL_LABELS[activeTool]} · 缩放: {Math.round(zoom * 100)}% · {selectionLabel}
      </span>
      <span className={styles.right}>
        撤销栈: {undoCount} · 重做栈: {redoCount}
      </span>
    </div>
  )
}
