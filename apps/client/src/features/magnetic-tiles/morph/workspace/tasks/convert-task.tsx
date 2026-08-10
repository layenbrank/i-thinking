import { Icon } from '@iconify/react/offline'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { Alert, Button } from 'antd'
import { useEffect, useState } from 'react'

import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { OperationStage } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/operation-stage'
import { PageBoard } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/page-board'
import styles from '@/features/magnetic-tiles/morph/workspace/tasks/tasks.module.scss'
import { MorphIpc } from '@/lib/morph-ipc'
import { useMorphStore } from '@/stores/morph.ts'

type ConvertFormat = 'png' | 'jpg' | 'docx' | 'xlsx'

type FormatOption = {
  value: ConvertFormat
  label: string
  hint: string
  icon: string
  tone: 'png' | 'jpg' | 'docx' | 'xlsx'
}

type ScaleOption = {
  value: number
  label: string
  detail: string
  hint: string
  tone: 'draft' | 'standard' | 'hd' | 'uhd' | 'print'
  level: 1 | 2 | 3 | 4 | 5
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'png',
    label: 'PNG',
    hint: '无损图片',
    icon: 'mdi:file-png-box',
    tone: 'png'
  },
  {
    value: 'jpg',
    label: 'JPG',
    hint: '压缩图片',
    icon: 'mdi:file-jpg-box',
    tone: 'jpg'
  },
  {
    value: 'docx',
    label: 'Word',
    hint: '可编辑文档',
    icon: 'mdi:file-word-box',
    tone: 'docx'
  },
  {
    value: 'xlsx',
    label: 'Excel',
    hint: '表格数据',
    icon: 'mdi:file-excel-box',
    tone: 'xlsx'
  }
]

const SCALE_OPTIONS: ScaleOption[] = [
  {
    value: 0.5,
    label: '草稿',
    detail: '72 DPI',
    hint: '预览够用',
    tone: 'draft',
    level: 1
  },
  {
    value: 1,
    label: '标准',
    detail: '144 DPI',
    hint: '日常分享',
    tone: 'standard',
    level: 2
  },
  {
    value: 2,
    label: '高清',
    detail: '300 DPI',
    hint: '屏幕阅读',
    tone: 'hd',
    level: 3
  },
  {
    value: 3,
    label: '超清',
    detail: '600 DPI',
    hint: '细节保留',
    tone: 'uhd',
    level: 4
  },
  {
    value: 4,
    label: '印刷',
    detail: '1200 DPI',
    hint: '输出打印',
    tone: 'print',
    level: 5
  }
]

type SampleState = {
  key: string
  image: Morph.Render | null
}

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
  const thumbnails = useMorphStore(function (s) {
    return s.thumbnails
  })
  const thumbnailsError = useMorphStore(function (s) {
    return s.thumbnailsError
  })
  const toCloseOperation = useMorphStore(function (s) {
    return s.toCloseOperation
  })
  const toPatchConvert = useMorphStore(function (s) {
    return s.toPatchConvert
  })
  const toExecuteConvert = useMorphStore(function (s) {
    return s.toExecuteConvert
  })
  const toOpenFilePicker = useMorphStore(function (s) {
    return s.toOpenFilePicker
  })
  const toFetchThumbnails = useMorphStore(function (s) {
    return s.toFetchThumbnails
  })

  const isImage = format === 'png' || format === 'jpg'
  const previewKey = isImage && file ? `${file.path}:${scale}` : ''
  const [sample, setSample] = useState<SampleState | null>(null)
  const previewImage = previewKey && sample?.key === previewKey ? sample.image : null
  const isSampleLoading = Boolean(previewKey) && sample?.key !== previewKey

  useEffect(
    function () {
      if (!file || !previewKey) return
      let cancelled = false
      void MorphIpc.toRender(file.path, 0, scale)
        .then(function (image) {
          if (!cancelled) setSample({ key: previewKey, image })
        })
        .catch(function () {
          if (!cancelled) setSample({ key: previewKey, image: null })
        })
      return function () {
        cancelled = true
      }
    },
    [file, previewKey, scale]
  )

  async function onSelectDir() {
    const selected = await dialogOpen({ directory: true, title: '选择输出目录' })
    if (typeof selected === 'string') toPatchConvert({ destDir: selected })
  }

  const canSubmit = Boolean(destDir) && Boolean(file)
  const meta = file
    ? `${file.path.split(/[\\/]/).pop()} · ${file.count} 页 · ${format.toUpperCase()}`
    : '请先打开 PDF'

  return (
    <OperationStage
      title="转换 PDF"
      icon="ant-design:swap-outlined"
      meta={meta}
      onBack={toCloseOperation}
      fields={
        <>
          <div className={styles.optionGroup}>
            <div
              className={styles.formatPicker}
              role="radiogroup"
              aria-label="输出格式">
              {FORMAT_OPTIONS.map(function (option) {
                const isActive = format === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    data-active={isActive}
                    data-tone={option.tone}
                    className={styles.formatOption}
                    onClick={function () {
                      toPatchConvert({ format: option.value })
                    }}>
                    <span
                      className={styles.formatBadge}
                      aria-hidden>
                      <Icon
                        icon={option.icon}
                        width={16}
                        height={16}
                      />
                    </span>
                    <span className={styles.formatText}>
                      <span className={styles.formatTitle}>{option.label}</span>
                      <span className={styles.formatHint}>{option.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {isImage ? (
            <div className={styles.optionGroup}>
              <div
                className={styles.qualityPicker}
                role="radiogroup"
                aria-label="导出质量">
                {SCALE_OPTIONS.map(function (option) {
                  const isActive = scale === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      title={`${option.label} · ${option.hint}`}
                      data-active={isActive}
                      data-tone={option.tone}
                      data-level={option.level}
                      className={styles.qualityOption}
                      onClick={function () {
                        toPatchConvert({ scale: option.value })
                      }}>
                      <span
                        className={styles.qualityBadge}
                        aria-hidden>
                        <span className={styles.qualityBars}>
                          {Array.from({ length: 5 }, function (_, index) {
                            return (
                              <span
                                key={index}
                                className={styles.qualityBar}
                                data-on={index < option.level}
                              />
                            )
                          })}
                        </span>
                      </span>
                      <span className={styles.qualityText}>
                        <span className={styles.qualityLabel}>{option.label}</span>
                        <span className={styles.qualityDetail}>{option.detail}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </>
      }
      extra={
        <PathField
          compact
          label="输出目录"
          value={destDir}
          placeholder="选择输出目录"
          onBrowse={function () {
            void onSelectDir()
          }}
        />
      }
      hint={error ?? undefined}
      submitLabel="开始转换"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onSubmit={function () {
        void toExecuteConvert()
      }}>
      {!file ? (
        <div className={styles.stageEmpty}>
          <Alert
            type="info"
            showIcon
            message="请先打开一个 PDF，再进行转换"
            action={
              <Button
                size="small"
                type="link"
                onClick={function () {
                  void toOpenFilePicker()
                }}>
                打开 PDF
              </Button>
            }
          />
        </div>
      ) : isImage ? (
        <div className={styles.sampleStage}>
          {previewImage ? (
            <img
              className={styles.sampleHero}
              src={`data:image/png;base64,${previewImage.base64}`}
              alt="转换首页预览"
            />
          ) : (
            <p className={styles.help}>{isSampleLoading ? '正在渲染预览…' : '暂无预览'}</p>
          )}
          {thumbnails.length > 0 ? (
            <div className={styles.sampleStrip}>
              {thumbnails.slice(0, 8).map(function (image) {
                return (
                  <img
                    key={image.offset}
                    className={styles.stripThumb}
                    src={`data:image/png;base64,${image.base64}`}
                    alt={`第 ${image.offset + 1} 页`}
                  />
                )
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <PageBoard
          thumbnails={thumbnails}
          count={file.count}
          isLoading={!thumbnailsError && thumbnails.length === 0}
          hasError={Boolean(thumbnailsError)}
          onRetry={function () {
            void toFetchThumbnails()
          }}
        />
      )}
    </OperationStage>
  )
}

export { ConvertTask }
