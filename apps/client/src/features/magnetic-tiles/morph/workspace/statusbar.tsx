import { clsx } from 'clsx'

import { useMorphStore } from '@/stores/morph.ts'
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
  const activeTool = useMorphStore(function (s) {
    return s.activeTool
  })
  const zoom = useMorphStore(function (s) {
    return s.zoom
  })
  const selectedId = useMorphStore(function (s) {
    return s.selectedAnnotationId
  })
  const currentPage = useMorphStore(function (s) {
    return s.currentPage
  })
  const pageCount = useMorphStore(function (s) {
    return s.file?.page_count ?? 0
  })

  const selectionLabel = selectedId ? '已选中对象' : '未选中对象'
  const pageLabel = pageCount > 0 ? `${currentPage + 1} / ${pageCount}` : '—'

  return (
    <div className={clsx(styles.statusbar)}>
      <span className={styles.left}>
        就绪
        <span className={styles.dot} aria-hidden />
        工具：{TOOL_LABELS[activeTool]}
        <span className={styles.dot} aria-hidden />
        缩放：
        <span className={styles.num}>{Math.round(zoom * 100)}%</span>
        <span className={styles.dot} aria-hidden />
        {selectionLabel}
      </span>
      <span className={styles.right}>
        页码：
        <span className={styles.num}>{pageLabel}</span>
      </span>
    </div>
  )
}
