import { CompressOutlined, ScissorOutlined, SwapOutlined } from '@ant-design/icons'
import { Button, InputNumber, Segmented, Space, Tooltip } from 'antd'
import { clsx } from 'clsx'

import { Glide } from '@/components/glide/glide'
import { useMorphStore } from '@/stores/morph.ts'
import styles from './toolbar.module.scss'

function onTeleport() {
  return document.body
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: { key: Morph.Tool; label: string; shortcut: string }[] = [
  { key: 'select', label: '选择', shortcut: 'S' },
  { key: 'text', label: '文本', shortcut: 'T' },
  { key: 'highlight', label: '高亮', shortcut: 'H' },
  { key: 'shape', label: '形状', shortcut: '□' },
  { key: 'stamp', label: '签章', shortcut: '印' },
  { key: 'crop', label: '裁剪', shortcut: 'C' },
  { key: 'rotate', label: '旋转', shortcut: 'R' }
]

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export default function Toolbar() {
  const activeTool = useMorphStore((s) => s.activeTool)
  const viewMode = useMorphStore((s) => s.viewMode)
  const currentPage = useMorphStore((s) => s.currentPage)
  const pageCount = useMorphStore((s) => s.file?.page_count ?? 0)
  const zoom = useMorphStore((s) => s.zoom)
  const undo = useMorphStore((s) => s.undo)
  const redo = useMorphStore((s) => s.redo)
  const undoCount = useMorphStore((s) => s.undoStack.length)
  const redoCount = useMorphStore((s) => s.redoStack.length)
  const setTool = useMorphStore((s) => s.setTool)
  const setViewMode = useMorphStore((s) => s.setViewMode)
  const setPage = useMorphStore((s) => s.setPage)
  const zoomIn = useMorphStore((s) => s.zoomIn)
  const zoomOut = useMorphStore((s) => s.zoomOut)
  const fitWidth = useMorphStore((s) => s.fitWidth)
  const file = useMorphStore((s) => s.file)
  const openMergeModal = useMorphStore((s) => s.openMergeModal)
  const openSplitModal = useMorphStore((s) => s.openSplitModal)
  const openConvertModal = useMorphStore((s) => s.openConvertModal)

  const docTitle = file?.title || file?.path.split(/[\\/]/).pop() || '—'

  // unused — filename already shown in utility bar
  void docTitle

  return (
    <div className={clsx([styles.toolbar, styles.root])}>
      {/* ── Left: page navigation + zoom ─────────────────────────── */}
      <div className={styles.navGroup}>
        <Space.Compact size="small">
          <Button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}>
            ‹
          </Button>
          <InputNumber
            size="small"
            className={styles.pageInput}
            min={1}
            max={pageCount || 1}
            value={currentPage + 1}
            onChange={(v) => v != null && setPage(v - 1)}
            controls={false}
          />
          <Button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}>
            ›
          </Button>
        </Space.Compact>
        <span className={styles.pageTotal}>/ {pageCount}</span>

        <span className={styles.sep} />

        <Space.Compact size="small">
          <Button onClick={zoomOut}>−</Button>
          <Button
            className={styles.zoomBtn}
            onClick={fitWidth}>
            {Math.round(zoom * 100)}%
          </Button>
          <Button onClick={zoomIn}>+</Button>
        </Space.Compact>
      </div>

      {/* ── Center: all tools + ops (horizontally scrollable) ────── */}
      <Glide.X
        classNames={{
          root: styles.scrollRoot,
          inner: styles.toolsRow
        }}>
        {/* Annotation tools */}
        {TOOLS.map((tool) => (
          <Tooltip
            key={tool.key}
            title={`${tool.label} (${tool.shortcut})`}
            placement="bottom"
            getPopupContainer={onTeleport}>
            <button
              className={clsx([styles.toolBtn, activeTool === tool.key && styles.active])}
              onClick={() => setTool(tool.key)}>
              {tool.label}
            </button>
          </Tooltip>
        ))}

        <span className={styles.sep} />

        {/* Document operations */}
        <Tooltip
          title="将多个 PDF 合并为一个文件"
          placement="bottom"
          getPopupContainer={onTeleport}>
          <button
            className={styles.toolBtn}
            onClick={openMergeModal}>
            <CompressOutlined className={styles.opIcon} />
            合并
          </button>
        </Tooltip>
        <Tooltip
          title="按页码或书签拆分为多个文件"
          placement="bottom"
          getPopupContainer={onTeleport}>
          <button
            className={styles.toolBtn}
            onClick={openSplitModal}>
            <ScissorOutlined className={styles.opIcon} />
            拆分
          </button>
        </Tooltip>
        <Tooltip
          title="PDF ↔ Word / Excel / 图片"
          placement="bottom"
          getPopupContainer={onTeleport}>
          <button
            className={styles.toolBtn}
            onClick={openConvertModal}>
            <SwapOutlined className={styles.opIcon} />
            转换
          </button>
        </Tooltip>

        <span className={styles.sep} />

        {/* Undo / redo */}
        <Tooltip
          title="撤销"
          placement="bottom"
          getPopupContainer={onTeleport}>
          <button
            className={styles.toolBtn}
            disabled={undoCount === 0}
            onClick={() => void undo()}>
            撤销
          </button>
        </Tooltip>
        <Tooltip
          title="重做"
          placement="bottom"
          getPopupContainer={onTeleport}>
          <button
            className={styles.toolBtn}
            disabled={redoCount === 0}
            onClick={() => void redo()}>
            重做
          </button>
        </Tooltip>
      </Glide.X>

      {/* ── Right: view mode + export + print ─────────────────────── */}
      <div className={styles.rightGroup}>
        <Segmented
          size="small"
          value={viewMode}
          onChange={(v) => setViewMode(v as Morph.ViewMode)}
          options={[
            { label: '浏览', value: 'view' },
            { label: '编辑', value: 'edit' }
          ]}
        />
        <span className={styles.sep} />
        <Button
          size="small"
          type="primary"
          className={styles.actionBtn}>
          导出
        </Button>
        <Button
          size="small"
          className={styles.actionBtn}>
          打印
        </Button>
      </div>
    </div>
  )
}
