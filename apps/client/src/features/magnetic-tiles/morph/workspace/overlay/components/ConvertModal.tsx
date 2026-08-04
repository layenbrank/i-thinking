import { Icon } from '@iconify/react/offline'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { Alert, Button, Input, Modal, Radio, Slider, Space, Tooltip, Typography } from 'antd'

import { useMorphStore } from '@/stores/morph.ts'

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG 图片（无损）' },
  { value: 'jpg', label: 'JPG 图片（有损压缩）' },
  { value: 'docx', label: 'Word 文档 (.docx)' },
  { value: 'xlsx', label: 'Excel 表格 (.xlsx)' }
] as const

const SCALE_MARKS: Record<number, string> = {
  0.5: '0.5×',
  1.0: '1×',
  2.0: '2×',
  3.0: '3×',
  4.0: '4×'
}

export default function ConvertModal() {
  const open = useMorphStore((s) => s.convertModal.open)
  const format = useMorphStore((s) => s.convertModal.format)
  const scale = useMorphStore((s) => s.convertModal.scale)
  const destDir = useMorphStore((s) => s.convertModal.destDir)
  const loading = useMorphStore((s) => s.convertModal.loading)
  const error = useMorphStore((s) => s.convertModal.error)
  const file = useMorphStore((s) => s.file)

  const closeConvertModal = useMorphStore((s) => s.closeConvertModal)
  const setConvertModal = useMorphStore((s) => s.setConvertModal)
  const executeConvert = useMorphStore((s) => s.executeConvert)

  const isImage = format === 'png' || format === 'jpg'

  const handleSelectDir = async () => {
    const selected = await dialogOpen({ directory: true, title: '选择输出目录' })
    if (selected) setConvertModal({ destDir: selected as string })
  }

  const canSubmit = !!destDir && !!file

  return (
    <Modal
      open={open}
      title="转换 PDF"
      onCancel={closeConvertModal}
      footer={
        <Space>
          <Button onClick={closeConvertModal}>取消</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={!canSubmit}
            onClick={() => void executeConvert()}>
            开始转换
          </Button>
        </Space>
      }
      width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
        {file && (
          <Typography.Text type="secondary">
            当前文件：{file.path.split(/[\\/]/).pop()}（{file.page_count} 页）
          </Typography.Text>
        )}

        {/* Format selection */}
        <div>
          <Typography.Text style={{ display: 'block', marginBottom: 6 }}>目标格式</Typography.Text>
          <Radio.Group
            value={format}
            onChange={(e) =>
              setConvertModal({ format: e.target.value as 'png' | 'jpg' | 'docx' | 'xlsx' })
            }>
            <Space orientation="vertical">
              {FORMAT_OPTIONS.map((opt) => (
                <Radio
                  key={opt.value}
                  value={opt.value}>
                  {opt.label}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </div>

        {/* Scale slider for image formats */}
        {isImage && (
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 4 }}>
              分辨率缩放
              <Tooltip title={`scale = ${scale}×，越大越清晰，文件也越大`}>
                <Icon
                  icon="ant-design:info-circle-outlined"
                  width={14}
                  height={14}
                  style={{ marginLeft: 6, color: 'var(--ant-color-text-tertiary, rgba(0,0,0,0.35))' }}
                />
              </Tooltip>
            </Typography.Text>
            <Slider
              min={0.5}
              max={4.0}
              step={0.5}
              marks={SCALE_MARKS}
              value={scale}
              onChange={(v) => setConvertModal({ scale: v })}
            />
          </div>
        )}

        {/* Quality note for office formats */}
        {!isImage && (
          <Alert
            type="warning"
            showIcon
            message="转换质量说明"
            description="PDF 是展示格式，不含文档语义结构。转换基于文字提取与布局重组，适用于纯文字类 PDF（合同、报告等）；复杂排版（多栏、表格混排、扫描件）转换效果有限。"
          />
        )}

        {/* Output dir */}
        <div>
          <Typography.Text style={{ display: 'block', marginBottom: 4 }}>输出目录</Typography.Text>
          <Space.Compact style={{ display: 'flex' }}>
            <Input
              value={destDir}
              placeholder="请选择输出目录"
              readOnly
              style={{ flex: 1 }}
            />
            <Button
              icon={
              <Icon
                icon="ant-design:folder-open-outlined"
                width={14}
                height={14}
              />
            }
              onClick={() => void handleSelectDir()}>
              浏览...
            </Button>
          </Space.Compact>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
          />
        )}
      </div>
    </Modal>
  )
}
