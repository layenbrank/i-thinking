import { Icon } from '@iconify/react/offline'
import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog'
import { Alert, Button } from 'antd'

import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { TaskShell } from '@/features/magnetic-tiles/morph/workspace/tasks/task-shell'
import styles from '@/features/magnetic-tiles/morph/workspace/tasks/tasks.module.scss'
import { useMorphStore } from '@/stores/morph.ts'

function findFileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}

function MergeTask() {
  const inputs = useMorphStore(function (s) {
    return s.mergeModal.inputs
  })
  const output = useMorphStore(function (s) {
    return s.mergeModal.output
  })
  const loading = useMorphStore(function (s) {
    return s.mergeModal.loading
  })
  const error = useMorphStore(function (s) {
    return s.mergeModal.error
  })
  const closeMergeModal = useMorphStore(function (s) {
    return s.closeMergeModal
  })
  const setMergeModal = useMorphStore(function (s) {
    return s.setMergeModal
  })
  const executeMerge = useMorphStore(function (s) {
    return s.executeMerge
  })

  async function onAddFiles() {
    const selected = await dialogOpen({
      title: '选择要合并的 PDF',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      multiple: true
    })
    if (!selected) return
    const paths = (Array.isArray(selected) ? selected : [selected]) as string[]
    setMergeModal({ inputs: [...inputs, ...paths.filter(function (path) {
      return !inputs.includes(path)
    })] })
  }

  async function onSelectOutput() {
    const selected = await dialogSave({
      title: '选择合并输出路径',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (selected) setMergeModal({ output: selected as string })
  }

  function onRemove(index: number) {
    setMergeModal({
      inputs: inputs.filter(function (_path, i) {
        return i !== index
      })
    })
  }

  function onMove(index: number, delta: number) {
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= inputs.length) return
    const next = inputs.slice()
    const temp = next[index]
    next[index] = next[nextIndex]
    next[nextIndex] = temp
    setMergeModal({ inputs: next })
  }

  const canSubmit = inputs.length >= 2 && Boolean(output)
  const hint = canSubmit
    ? `将按顺序合并 ${inputs.length} 个文件`
    : inputs.length < 2
      ? '至少添加 2 个 PDF'
      : '请选择输出路径'

  return (
    <TaskShell
      title="合并 PDF"
      description="按下列顺序合并文件。可调整顺序，至少需要 2 个文件。"
      hint={hint}
      submitLabel="开始合并"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onCancel={closeMergeModal}
      onSubmit={function () {
        void executeMerge()
      }}>
      {inputs.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyText}>尚未添加 PDF</span>
          <Button
            type="primary"
            ghost
            icon={
              <Icon
                icon="ant-design:plus-outlined"
                width={14}
                height={14}
              />
            }
            onClick={function () {
              void onAddFiles()
            }}>
            添加 PDF 文件
          </Button>
        </div>
      ) : (
        <div className={styles.fileList}>
          {inputs.map(function (path, index) {
            return (
              <div
                key={`${path}-${index}`}
                className={styles.fileRow}>
                <span className={styles.index}>{index + 1}</span>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{findFileName(path)}</span>
                  <span
                    className={styles.filePath}
                    title={path}>
                    {path}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    type="text"
                    size="small"
                    aria-label="上移"
                    disabled={index === 0}
                    icon={
                      <Icon
                        icon="ant-design:arrow-up-outlined"
                        width={14}
                        height={14}
                      />
                    }
                    onClick={function () {
                      onMove(index, -1)
                    }}
                  />
                  <Button
                    type="text"
                    size="small"
                    aria-label="下移"
                    disabled={index === inputs.length - 1}
                    icon={
                      <Icon
                        icon="ant-design:arrow-down-outlined"
                        width={14}
                        height={14}
                      />
                    }
                    onClick={function () {
                      onMove(index, 1)
                    }}
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    aria-label="移除"
                    icon={
                      <Icon
                        icon="ant-design:delete-outlined"
                        width={14}
                        height={14}
                      />
                    }
                    onClick={function () {
                      onRemove(index)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {inputs.length > 0 ? (
        <Button
          className={styles.addBtn}
          icon={
            <Icon
              icon="ant-design:folder-open-outlined"
              width={14}
              height={14}
            />
          }
          onClick={function () {
            void onAddFiles()
          }}>
          添加 PDF 文件
        </Button>
      ) : null}

      <PathField
        label="输出文件"
        value={output}
        placeholder="请选择输出路径"
        onBrowse={function () {
          void onSelectOutput()
        }}
      />

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
        />
      ) : null}
    </TaskShell>
  )
}

export { MergeTask }
