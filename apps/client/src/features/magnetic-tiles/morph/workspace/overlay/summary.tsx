import { Icon } from '@iconify/react/offline'
import {
  Button,
  ColorPicker,
  Divider,
  Empty,
  Form,
  InputNumber,
  Select,
  Tabs,
  Typography
} from 'antd'
import { save } from '@tauri-apps/plugin-dialog'
import { clsx } from 'clsx'

import { selectSelectedAnnotation, useMorphStore } from '@/stores/morph.ts'
import styles from '@/features/magnetic-tiles/morph/workspace/overlay/summary.module.scss'

// ─── Properties tab ──────────────────────────────────────────────────────────

function PropertiesTab() {
  const selected = useMorphStore(selectSelectedAnnotation)
  const updateAnnotation = useMorphStore((s) => s.updateAnnotationData)
  const removeById = useMorphStore((s) => s.removeAnnotationById)

  if (!selected) {
    return (
      <Empty
        description="请选择一个批注对象"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className={styles.emptyProps}
      />
    )
  }

  const { rect, data } = selected

  return (
    <div className={styles.propsForm}>
      <Typography.Text
        type="secondary"
        className={styles.sectionLabel}>
        位置与尺寸
      </Typography.Text>
      <Form
        layout="inline"
        size="small"
        className={styles.rectForm}>
        <Form.Item label="X">
          <InputNumber
            min={0}
            max={1}
            step={0.001}
            precision={3}
            value={rect.x}
            onChange={(v) =>
              v != null && void updateAnnotation(selected.id, { rect: { ...rect, x: v } })
            }
          />
        </Form.Item>
        <Form.Item label="Y">
          <InputNumber
            min={0}
            max={1}
            step={0.001}
            precision={3}
            value={rect.y}
            onChange={(v) =>
              v != null && void updateAnnotation(selected.id, { rect: { ...rect, y: v } })
            }
          />
        </Form.Item>
        <Form.Item label="W">
          <InputNumber
            min={0.001}
            max={1}
            step={0.001}
            precision={3}
            value={rect.w}
            onChange={(v) =>
              v != null && void updateAnnotation(selected.id, { rect: { ...rect, w: v } })
            }
          />
        </Form.Item>
        <Form.Item label="H">
          <InputNumber
            min={0.001}
            max={1}
            step={0.001}
            precision={3}
            value={rect.h}
            onChange={(v) =>
              v != null && void updateAnnotation(selected.id, { rect: { ...rect, h: v } })
            }
          />
        </Form.Item>
      </Form>

      <Divider className={styles.divider} />
      <Typography.Text
        type="secondary"
        className={styles.sectionLabel}>
        样式
      </Typography.Text>

      {'color' in data && (
        <Form
          layout="horizontal"
          size="small"
          labelCol={{ span: 8 }}>
          <Form.Item label="颜色">
            <ColorPicker
              size="small"
              value={(data as Morph.HighlightData).color}
              onChange={(c) =>
                void updateAnnotation(selected.id, {
                  data: { ...(data as Morph.HighlightData), color: c.toHexString() }
                })
              }
            />
          </Form.Item>
          {'opacity' in data && (
            <Form.Item label="透明度">
              <InputNumber
                min={0}
                max={1}
                step={0.1}
                precision={1}
                value={(data as Morph.HighlightData).opacity}
                onChange={(v) =>
                  v != null &&
                  void updateAnnotation(selected.id, {
                    data: { ...(data as Morph.HighlightData), opacity: v }
                  })
                }
              />
            </Form.Item>
          )}
        </Form>
      )}

      <Divider className={styles.divider} />
      <Button
        danger
        size="small"
        block
        onClick={() => void removeById(selected.id)}>
        删除批注
      </Button>
    </div>
  )
}

// ─── Export tab ───────────────────────────────────────────────────────────────

function ExportTab() {
  const file = useMorphStore((s) => s.file)
  const exportState = useMorphStore((s) => s.exportState)
  const setExport = useMorphStore((s) => s.setExportState)
  const exportPdf = useMorphStore((s) => s.exportPdf)

  async function handleExport() {
    if (!file) return
    const dest = await save({
      title: '导出 PDF',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: file.path.replace(/\.pdf$/i, '_export.pdf')
    })
    if (dest) await exportPdf(dest)
  }

  return (
    <div className={styles.exportForm}>
      <Form
        layout="vertical"
        size="small">
        <Form.Item label="导出格式">
          <Select
            value={exportState.format}
            onChange={(v) => setExport({ format: v })}
            options={[
              { label: 'PDF', value: 'pdf' },
              { label: 'PDF/A', value: 'pdf-a' },
              { label: 'PNG（逐页）', value: 'png' }
            ]}
          />
        </Form.Item>
        <Form.Item label="页面范围">
          <Select
            value={exportState.range}
            onChange={(v) => setExport({ range: v })}
            options={[
              { label: '全部页面', value: 'all' },
              { label: '当前页', value: 'current' },
              { label: '自定义', value: 'custom' }
            ]}
          />
        </Form.Item>
      </Form>
      <Button
        type="primary"
        block
        onClick={handleExport}
        disabled={!file}>
        导出
      </Button>
    </div>
  )
}

// ─── History tab ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const undoStack = useMorphStore((s) => s.undoStack)
  const undo = useMorphStore((s) => s.undo)

  if (!undoStack.length) {
    return (
      <Empty
        description="暂无操作记录"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className={styles.emptyProps}
      />
    )
  }

  return (
    <div className={styles.historyList}>
      {[...undoStack].reverse().map((entry) => (
        <div
          key={entry.timestamp}
          className={styles.historyItem}>
          <span className={styles.historyLabel}>{entry.label}</span>
          <span className={styles.historyTime}>
            {new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </div>
      ))}
      <Button
        size="small"
        block
        onClick={undo}
        disabled={!undoStack.length}
        className={styles.undoBtn}>
        撤销最后操作
      </Button>
    </div>
  )
}

// ─── Summary root ─────────────────────────────────────────────────────────────

export default function Summary() {
  const toggleSummary = useMorphStore((s) => s.toggleSummary)

  return (
    <div className={clsx([styles.summary, styles.root])}>
      <div className={styles.header}>
        <span className={styles.title}>属性</span>
        <Button
          type="text"
          size="small"
          icon={
            <Icon
              icon="ant-design:close-outlined"
              width={14}
              height={14}
            />
          }
          onClick={toggleSummary}
          className={styles.closeBtn}
        />
      </div>
      <Tabs
        size="small"
        className={styles.tabs}
        defaultActiveKey="props"
        items={[
          { key: 'props', label: '属性', children: <PropertiesTab /> },
          { key: 'export', label: '导出', children: <ExportTab /> },
          { key: 'history', label: '历史', children: <HistoryTab /> }
        ]}
      />
    </div>
  )
}
