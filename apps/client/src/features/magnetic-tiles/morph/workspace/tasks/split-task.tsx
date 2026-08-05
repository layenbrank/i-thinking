import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { Alert, Button, Input, InputNumber, Segmented, Space } from 'antd'

import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { TaskShell } from '@/features/magnetic-tiles/morph/workspace/tasks/task-shell'
import styles from '@/features/magnetic-tiles/morph/workspace/tasks/tasks.module.scss'
import { useMorphStore } from '@/stores/morph.ts'

const RANGE_EXAMPLES = ['1-3, 4-6', '1-5', '7-10, 11-15']

function SplitTask() {
  const mode = useMorphStore(function (s) {
    return s.splitModal.mode
  })
  const ranges = useMorphStore(function (s) {
    return s.splitModal.ranges
  })
  const count = useMorphStore(function (s) {
    return s.splitModal.count
  })
  const destDir = useMorphStore(function (s) {
    return s.splitModal.destDir
  })
  const loading = useMorphStore(function (s) {
    return s.splitModal.loading
  })
  const error = useMorphStore(function (s) {
    return s.splitModal.error
  })
  const file = useMorphStore(function (s) {
    return s.file
  })
  const closeSplitModal = useMorphStore(function (s) {
    return s.closeSplitModal
  })
  const setSplitModal = useMorphStore(function (s) {
    return s.setSplitModal
  })
  const executeSplit = useMorphStore(function (s) {
    return s.executeSplit
  })

  async function onSelectDir() {
    const selected = await dialogOpen({ directory: true, title: '选择输出目录' })
    if (selected) setSplitModal({ destDir: selected as string })
  }

  const canSubmit =
    Boolean(destDir) &&
    Boolean(file) &&
    (mode === 'count' ? count > 0 : ranges.trim().length > 0)

  const hint = !file
    ? '请先在工作区打开 PDF'
    : canSubmit
      ? '将按当前规则生成多个 PDF'
      : mode === 'ranges'
        ? '请填写页码范围并选择输出目录'
        : '请设置每文件页数并选择输出目录'

  return (
    <TaskShell
      title="拆分 PDF"
      description="按页码范围或固定页数拆成多个文件。"
      hint={hint}
      submitLabel="开始拆分"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onCancel={closeSplitModal}
      onSubmit={function () {
        void executeSplit()
      }}>
      {file ? (
        <p className={styles.fileMeta}>
          当前文件：{file.path.split(/[\\/]/).pop()}（{file.page_count} 页）
        </p>
      ) : (
        <Alert
          type="info"
          showIcon
          message="请先打开一个 PDF，再进行拆分"
        />
      )}

      <div>
        <span className={styles.sectionLabel}>拆分方式</span>
        <Segmented
          className={styles.segmented}
          block
          value={mode}
          options={[
            { label: '按页码范围', value: 'ranges' },
            { label: '按固定页数', value: 'count' }
          ]}
          onChange={function (value) {
            setSplitModal({ mode: value as 'ranges' | 'count' })
          }}
        />
      </div>

      {mode === 'ranges' ? (
        <div>
          <span className={styles.sectionLabel}>页码范围</span>
          <Input.TextArea
            rows={3}
            value={ranges}
            placeholder={'每行或用逗号分隔范围，例如：\n1-3, 4-6, 7-10'}
            aria-label="页码范围"
            onChange={function (event) {
              setSplitModal({ ranges: event.target.value })
            }}
          />
          <div className={styles.chips}>
            {RANGE_EXAMPLES.map(function (example) {
              return (
                <button
                  key={example}
                  type="button"
                  className={styles.chip}
                  onClick={function () {
                    setSplitModal({ ranges: example })
                  }}>
                  {example}
                </button>
              )
            })}
          </div>
          <p className={styles.help}>示例：1-3, 4-6 生成两个文件，分别含第 1–3 页与第 4–6 页。</p>
        </div>
      ) : (
        <div>
          <span className={styles.sectionLabel}>每个文件页数</span>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              min={1}
              max={file?.page_count ?? 9999}
              value={count}
              style={{ width: '100%' }}
              aria-label="每个文件页数"
              onChange={function (value) {
                setSplitModal({ count: value ?? 1 })
              }}
            />
            <Button disabled>页 / 文件</Button>
          </Space.Compact>
        </div>
      )}

      <PathField
        label="输出目录"
        value={destDir}
        placeholder="请选择输出目录"
        onBrowse={function () {
          void onSelectDir()
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

export { SplitTask }
