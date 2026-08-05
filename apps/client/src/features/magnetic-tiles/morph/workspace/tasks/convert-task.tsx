import { Icon } from '@iconify/react/offline'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { Alert, Collapse, Segmented } from 'antd'

import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { TaskShell } from '@/features/magnetic-tiles/morph/workspace/tasks/task-shell'
import styles from '@/features/magnetic-tiles/morph/workspace/tasks/tasks.module.scss'
import { useMorphStore } from '@/stores/morph.ts'

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG 图片', hint: '无损，适合截图与归档' },
  { value: 'jpg', label: 'JPG 图片', hint: '有损压缩，体积更小' },
  { value: 'docx', label: 'Word 文档', hint: '.docx，适合再编辑' },
  { value: 'xlsx', label: 'Excel 表格', hint: '.xlsx，适合表格导出' }
] as const

const SCALE_OPTIONS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
  { label: '4×', value: 4 }
]

function ConvertTask() {
  const format = useMorphStore(function (s) {
    return s.convertModal.format
  })
  const scale = useMorphStore(function (s) {
    return s.convertModal.scale
  })
  const destDir = useMorphStore(function (s) {
    return s.convertModal.destDir
  })
  const loading = useMorphStore(function (s) {
    return s.convertModal.loading
  })
  const error = useMorphStore(function (s) {
    return s.convertModal.error
  })
  const file = useMorphStore(function (s) {
    return s.file
  })
  const closeConvertModal = useMorphStore(function (s) {
    return s.closeConvertModal
  })
  const setConvertModal = useMorphStore(function (s) {
    return s.setConvertModal
  })
  const executeConvert = useMorphStore(function (s) {
    return s.executeConvert
  })

  const isImage = format === 'png' || format === 'jpg'

  async function onSelectDir() {
    const selected = await dialogOpen({ directory: true, title: '选择输出目录' })
    if (selected) setConvertModal({ destDir: selected as string })
  }

  const canSubmit = Boolean(destDir) && Boolean(file)
  const hint = !file
    ? '请先在工作区打开 PDF'
    : canSubmit
      ? `将导出为 ${format.toUpperCase()}`
      : '请选择输出目录'

  return (
    <TaskShell
      title="转换 PDF"
      description="选择目标格式与输出位置。图片格式可调节分辨率缩放。"
      hint={hint}
      submitLabel="开始转换"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onCancel={closeConvertModal}
      onSubmit={function () {
        void executeConvert()
      }}>
      {file ? (
        <p className={styles.fileMeta}>
          当前文件：{file.path.split(/[\\/]/).pop()}（{file.page_count} 页）
        </p>
      ) : (
        <Alert
          type="info"
          showIcon
          message="请先打开一个 PDF，再进行转换"
        />
      )}

      <div>
        <span className={styles.sectionLabel}>目标格式</span>
        <div
          className={styles.formatGrid}
          role="radiogroup"
          aria-label="目标格式">
          {FORMAT_OPTIONS.map(function (option) {
            const isActive = format === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                data-active={isActive ? 'true' : undefined}
                className={styles.formatCard}
                onClick={function () {
                  setConvertModal({
                    format: option.value as 'png' | 'jpg' | 'docx' | 'xlsx'
                  })
                }}>
                <span className={styles.formatTitle}>{option.label}</span>
                <span className={styles.formatHint}>{option.hint}</span>
              </button>
            )
          })}
        </div>
      </div>

      {isImage ? (
        <div>
          <span className={styles.sectionLabel}>
            分辨率缩放
            <Icon
              className={styles.infoIcon}
              icon="ant-design:info-circle-outlined"
              width={12}
              height={12}
            />
          </span>
          <Segmented
            className={styles.segmented}
            block
            value={scale}
            options={SCALE_OPTIONS}
            onChange={function (value) {
              setConvertModal({ scale: Number(value) })
            }}
          />
          <p className={styles.help}>倍率越高越清晰，文件也越大。当前 {scale}×。</p>
        </div>
      ) : (
        <Collapse
          className={styles.collapse}
          ghost
          items={[
            {
              key: 'quality',
              label: '转换质量说明',
              children:
                'PDF 是展示格式，不含文档语义结构。转换基于文字提取与布局重组，适用于纯文字类 PDF；复杂排版或扫描件效果有限。'
            }
          ]}
        />
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

export { ConvertTask }
