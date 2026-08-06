import { Icon } from '@iconify/react/offline'
import { Button, InputNumber, Segmented, Space, Tooltip } from 'antd'
import { clsx } from 'clsx'

import { Glide } from '@/components/glide/glide'
import { useMorphStore } from '@/stores/morph.ts'
import { useCssVarClassName } from '@/themes'
import styles from './toolbar.module.scss'

const ICON_SIZE = 16

type ToolDef = {
  key: Morph.Tool
  label: string
  shortcut: string
  icon: string
}

const TOOLS: ToolDef[] = [
  { key: 'select', label: '选择', shortcut: 'S', icon: 'ant-design:select-outlined' },
  { key: 'text', label: '文本', shortcut: 'T', icon: 'ant-design:font-size-outlined' },
  { key: 'highlight', label: '高亮', shortcut: 'H', icon: 'ant-design:highlight-outlined' },
  { key: 'shape', label: '形状', shortcut: 'R', icon: 'ant-design:border-outlined' },
  { key: 'stamp', label: '签章', shortcut: 'P', icon: 'ant-design:safety-certificate-outlined' },
  { key: 'crop', label: '裁剪', shortcut: 'C', icon: 'ant-design:scissor-outlined' },
  { key: 'rotate', label: '旋转', shortcut: 'O', icon: 'ant-design:rotate-right-outlined' }
]

export default function Toolbar() {
  const cssVarClassName = useCssVarClassName()
  const activeTool = useMorphStore(function (s) {
    return s.activeTool
  })
  const viewMode = useMorphStore(function (s) {
    return s.viewMode
  })
  const currentPage = useMorphStore(function (s) {
    return s.currentPage
  })
  const pageCount = useMorphStore(function (s) {
    return s.file?.page_count ?? 0
  })
  const zoom = useMorphStore(function (s) {
    return s.zoom
  })
  const undo = useMorphStore(function (s) {
    return s.undo
  })
  const redo = useMorphStore(function (s) {
    return s.redo
  })
  const undoCount = useMorphStore(function (s) {
    return s.undoStack.length
  })
  const redoCount = useMorphStore(function (s) {
    return s.redoStack.length
  })
  const setTool = useMorphStore(function (s) {
    return s.setTool
  })
  const setViewMode = useMorphStore(function (s) {
    return s.setViewMode
  })
  const setPage = useMorphStore(function (s) {
    return s.setPage
  })
  const zoomIn = useMorphStore(function (s) {
    return s.zoomIn
  })
  const zoomOut = useMorphStore(function (s) {
    return s.zoomOut
  })
  const fitWidth = useMorphStore(function (s) {
    return s.fitWidth
  })
  const openOperation = useMorphStore(function (s) {
    return s.openOperation
  })
  const closeOperation = useMorphStore(function (s) {
    return s.closeOperation
  })
  const activeOperation = useMorphStore(function (s) {
    return s.activeOperation
  })

  return (
    <div className={clsx(styles.toolbar, styles.root, cssVarClassName)}>
      <div className={styles.navGroup}>
        <Space.Compact size="small">
          <Button
            type="text"
            aria-label="上一页"
            icon={
              <Icon
                icon="ant-design:left-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
            }
            disabled={currentPage === 0}
            onClick={function () {
              setPage(currentPage - 1)
            }}
          />
          <InputNumber
            size="small"
            className={styles.pageInput}
            min={1}
            max={pageCount || 1}
            value={currentPage + 1}
            controls={false}
            onChange={function (v) {
              if (typeof v === 'number') setPage(v - 1)
            }}
          />
          <Button
            type="text"
            aria-label="下一页"
            icon={
              <Icon
                icon="ant-design:right-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
            }
            disabled={currentPage >= pageCount - 1}
            onClick={function () {
              setPage(currentPage + 1)
            }}
          />
        </Space.Compact>
        <span className={styles.pageTotal}>/ {pageCount}</span>
        <span
          className={styles.sep}
          aria-hidden
        />
        <Space.Compact size="small">
          <Button
            type="text"
            aria-label="缩小"
            icon={
              <Icon
                icon="ant-design:zoom-out-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
            }
            onClick={zoomOut}
          />
          <Button
            type="text"
            className={styles.zoomBtn}
            onClick={fitWidth}>
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            type="text"
            aria-label="放大"
            icon={
              <Icon
                icon="ant-design:zoom-in-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
            }
            onClick={zoomIn}
          />
        </Space.Compact>
      </div>

      <Glide.X
        classNames={{
          root: styles.scrollRoot,
          inner: styles.toolsRow
        }}>
        {TOOLS.map(function (tool) {
          const isActive = activeTool === tool.key
          return (
            <Tooltip
              key={tool.key}
              title={`${tool.label} (${tool.shortcut})`}
              placement="bottom">
              <Button
                type="text"
                size="small"
                aria-label={tool.label}
                aria-pressed={isActive}
                className={clsx(styles.toolBtn, isActive && styles.toolBtnActive)}
                icon={
                  <Icon
                    icon={tool.icon}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                  />
                }
                onClick={function () {
                  setTool(tool.key)
                }}
              />
            </Tooltip>
          )
        })}
        <span
          className={styles.sep}
          aria-hidden
        />
        <Tooltip
          title="将多个 PDF 合并为一个文件"
          placement="bottom">
          <Button
            type="text"
            size="small"
            className={clsx(styles.opBtn, activeOperation === 'merge' && styles.opBtnActive)}
            aria-pressed={activeOperation === 'merge'}
            icon={
              <Icon
                icon="ant-design:compress-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
                className={styles.opIcon}
              />
            }
            onClick={function () {
              if (activeOperation === 'merge') closeOperation()
              else openOperation('merge')
            }}>
            合并
          </Button>
        </Tooltip>
        <Tooltip
          title="按页码范围或固定页数拆分"
          placement="bottom">
          <Button
            type="text"
            size="small"
            className={clsx(styles.opBtn, activeOperation === 'split' && styles.opBtnActive)}
            aria-pressed={activeOperation === 'split'}
            icon={
              <Icon
                icon="ant-design:scissor-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
                className={styles.opIcon}
              />
            }
            onClick={function () {
              if (activeOperation === 'split') closeOperation()
              else openOperation('split')
            }}>
            拆分
          </Button>
        </Tooltip>
        <Tooltip
          title="PDF ↔ Word / Excel / 图片"
          placement="bottom">
          <Button
            type="text"
            size="small"
            className={clsx(styles.opBtn, activeOperation === 'convert' && styles.opBtnActive)}
            aria-pressed={activeOperation === 'convert'}
            icon={
              <Icon
                icon="ant-design:swap-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
                className={styles.opIcon}
              />
            }
            onClick={function () {
              if (activeOperation === 'convert') closeOperation()
              else openOperation('convert')
            }}>
            转换
          </Button>
        </Tooltip>
        <Tooltip
          title="重排、旋转或删除页面"
          placement="bottom">
          <Button
            type="text"
            size="small"
            className={clsx(styles.opBtn, activeOperation === 'organize' && styles.opBtnActive)}
            aria-pressed={activeOperation === 'organize'}
            icon={
              <Icon
                icon="ant-design:appstore-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
                className={styles.opIcon}
              />
            }
            onClick={function () {
              if (activeOperation === 'organize') closeOperation()
              else openOperation('organize')
            }}>
            整理
          </Button>
        </Tooltip>
        <Tooltip
          title="抽取选中页为新 PDF"
          placement="bottom">
          <Button
            type="text"
            size="small"
            className={clsx(styles.opBtn, activeOperation === 'extract' && styles.opBtnActive)}
            aria-pressed={activeOperation === 'extract'}
            icon={
              <Icon
                icon="ant-design:export-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
                className={styles.opIcon}
              />
            }
            onClick={function () {
              if (activeOperation === 'extract') closeOperation()
              else openOperation('extract')
            }}>
            抽取
          </Button>
        </Tooltip>
        <span
          className={styles.sep}
          aria-hidden
        />
        <Tooltip
          title="撤销"
          placement="bottom">
          <Button
            type="text"
            size="small"
            aria-label="撤销"
            className={styles.toolBtn}
            disabled={undoCount === 0}
            icon={
              <Icon
                icon="ant-design:undo-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
            }
            onClick={function () {
              void undo()
            }}
          />
        </Tooltip>
        <Tooltip
          title="重做"
          placement="bottom">
          <Button
            type="text"
            size="small"
            aria-label="重做"
            className={styles.toolBtn}
            disabled={redoCount === 0}
            icon={
              <Icon
                icon="ant-design:redo-outlined"
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
            }
            onClick={function () {
              void redo()
            }}
          />
        </Tooltip>
      </Glide.X>

      <div className={styles.rightGroup}>
        <Segmented
          size="small"
          value={viewMode}
          className={styles.modeSegment}
          onChange={function (v) {
            setViewMode(v as Morph.ViewMode)
          }}
          options={[
            { label: '浏览', value: 'view' },
            { label: '编辑', value: 'edit' }
          ]}
        />
        <span
          className={styles.sep}
          aria-hidden
        />
        <Button
          size="small"
          type="primary"
          className={styles.actionBtn}>
          导出
        </Button>
        <Button
          size="small"
          type="default"
          className={styles.actionBtn}>
          打印
        </Button>
      </div>
    </div>
  )
}
