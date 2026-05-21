import { DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog'
import { Alert, Button, Input, Modal, Space, Typography } from 'antd'

import { useMorphStore } from '@/stores/morph.ts'

export default function MergeModal() {
  const open = useMorphStore((s) => s.mergeModal.open)
  const inputs = useMorphStore((s) => s.mergeModal.inputs)
  const output = useMorphStore((s) => s.mergeModal.output)
  const loading = useMorphStore((s) => s.mergeModal.loading)
  const error = useMorphStore((s) => s.mergeModal.error)

  const closeMergeModal = useMorphStore((s) => s.closeMergeModal)
  const setMergeModal = useMorphStore((s) => s.setMergeModal)
  const executeMerge = useMorphStore((s) => s.executeMerge)

  const handleAddFiles = async () => {
    const selected = await dialogOpen({
      title: '选择要合并的 PDF',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      multiple: true
    })
    if (!selected) return
    const paths = (Array.isArray(selected) ? selected : [selected]) as string[]
    setMergeModal({ inputs: [...inputs, ...paths.filter((p) => !inputs.includes(p))] })
  }

  const handleSelectOutput = async () => {
    const selected = await dialogSave({
      title: '选择合并输出路径',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (selected) setMergeModal({ output: selected as string })
  }

  const handleRemove = (index: number) => {
    setMergeModal({ inputs: inputs.filter((_, i) => i !== index) })
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const next = [...inputs]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setMergeModal({ inputs: next })
  }

  const canSubmit = inputs.length >= 2 && !!output

  return (
    <Modal
      open={open}
      title="合并 PDF"
      onCancel={closeMergeModal}
      footer={
        <Space>
          <Button onClick={closeMergeModal}>取消</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={!canSubmit}
            onClick={() => void executeMerge()}>
            开始合并
          </Button>
        </Space>
      }
      width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
        <Typography.Text type="secondary">
          按照下列顺序合并文件（可点击 ↑ 调整顺序）。需至少 2 个文件。
        </Typography.Text>

        {/* File list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 6,
            padding: '4px 0'
          }}>
          {inputs.length === 0 ? (
            <Typography.Text
              type="secondary"
              style={{ textAlign: 'center', padding: '20px 0', display: 'block' }}>
              请添加 PDF 文件
            </Typography.Text>
          ) : (
            inputs.map((p, i) => {
              const name = p.split(/[\\/]/).pop() ?? p
              return (
                <div
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 10px',
                    borderBottom: i < inputs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none'
                  }}>
                  <span
                    style={{
                      color: 'rgba(0,0,0,0.3)',
                      minWidth: 18,
                      textAlign: 'right',
                      fontSize: 12
                    }}>
                    {i + 1}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                    {name}
                  </span>
                  <Button
                    size="small"
                    type="text"
                    disabled={i === 0}
                    onClick={() => handleMoveUp(i)}>
                    ↑
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(i)}
                  />
                </div>
              )
            })
          )}
        </div>

        <Button
          size="small"
          icon={<FolderOpenOutlined />}
          onClick={() => void handleAddFiles()}>
          添加 PDF 文件
        </Button>

        {/* Output path */}
        <div>
          <Typography.Text style={{ display: 'block', marginBottom: 4 }}>输出文件</Typography.Text>
          <Space.Compact style={{ display: 'flex' }}>
            <Input
              value={output}
              placeholder="请选择输出路径"
              readOnly
              style={{ flex: 1 }}
            />
            <Button onClick={() => void handleSelectOutput()}>浏览...</Button>
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
