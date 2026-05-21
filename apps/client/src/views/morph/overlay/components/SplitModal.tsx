import { FolderOpenOutlined } from '@ant-design/icons'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { Alert, Button, Input, InputNumber, Modal, Radio, Space, Typography } from 'antd'

import { useMorphStore } from '@/stores/morph.ts'

export default function SplitModal() {
  const open = useMorphStore((s) => s.splitModal.open)
  const mode = useMorphStore((s) => s.splitModal.mode)
  const ranges = useMorphStore((s) => s.splitModal.ranges)
  const count = useMorphStore((s) => s.splitModal.count)
  const destDir = useMorphStore((s) => s.splitModal.destDir)
  const loading = useMorphStore((s) => s.splitModal.loading)
  const error = useMorphStore((s) => s.splitModal.error)
  const file = useMorphStore((s) => s.file)

  const closeSplitModal = useMorphStore((s) => s.closeSplitModal)
  const setSplitModal = useMorphStore((s) => s.setSplitModal)
  const executeSplit = useMorphStore((s) => s.executeSplit)

  const handleSelectDir = async () => {
    const selected = await dialogOpen({ directory: true, title: '选择输出目录' })
    if (selected) setSplitModal({ destDir: selected as string })
  }

  const canSubmit = !!destDir && !!file && (mode === 'count' ? count > 0 : ranges.trim().length > 0)

  return (
    <Modal
      open={open}
      title="拆分 PDF"
      onCancel={closeSplitModal}
      footer={
        <Space>
          <Button onClick={closeSplitModal}>取消</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={!canSubmit}
            onClick={() => void executeSplit()}>
            开始拆分
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

        {/* Mode selection */}
        <div>
          <Typography.Text style={{ display: 'block', marginBottom: 6 }}>拆分方式</Typography.Text>
          <Radio.Group
            value={mode}
            onChange={(e) => setSplitModal({ mode: e.target.value as 'ranges' | 'count' })}>
            <Radio value="ranges">按页码范围</Radio>
            <Radio value="count">按固定页数</Radio>
          </Radio.Group>
        </div>

        {/* Ranges mode */}
        {mode === 'ranges' && (
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 4 }}>
              页码范围
            </Typography.Text>
            <Input.TextArea
              rows={3}
              placeholder={'每行或用逗号分隔一个范围，例如：\n1-3, 4-6, 7-10'}
              value={ranges}
              onChange={(e) => setSplitModal({ ranges: e.target.value })}
            />
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              示例：<code>1-3, 4-6</code> 生成两个文件，分别含第 1-3 页、第 4-6 页
            </Typography.Text>
          </div>
        )}

        {/* Count mode */}
        {mode === 'count' && (
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 4 }}>
              每个文件页数
            </Typography.Text>
            <InputNumber
              min={1}
              max={file?.page_count ?? 9999}
              value={count}
              onChange={(v) => setSplitModal({ count: v ?? 1 })}
              style={{ width: '100%' }}
              addonAfter="页 / 文件"
            />
          </div>
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
              icon={<FolderOpenOutlined />}
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
