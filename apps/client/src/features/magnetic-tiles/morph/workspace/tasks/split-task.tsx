import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { Alert, Button, InputNumber, Segmented } from 'antd'
import { useMemo } from 'react'

import {
  buildRangesFromOffsets,
  parseRangesToOffsets,
  toggleOffset
} from '@/features/magnetic-tiles/morph/workspace/tasks/page-ranges'
import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { OperationStage } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/operation-stage'
import { PageBoard } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/page-board'
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
  const limit = useMorphStore(function (s) {
    return s.splitModal.limit
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
  const thumbnails = useMorphStore(function (s) {
    return s.thumbnails
  })
  const thumbnailsError = useMorphStore(function (s) {
    return s.thumbnailsError
  })
  const toCloseOperation = useMorphStore(function (s) {
    return s.toCloseOperation
  })
  const toPatchSplit = useMorphStore(function (s) {
    return s.toPatchSplit
  })
  const toExecuteSplit = useMorphStore(function (s) {
    return s.toExecuteSplit
  })
  const toOpenFilePicker = useMorphStore(function (s) {
    return s.toOpenFilePicker
  })
  const toFetchThumbnails = useMorphStore(function (s) {
    return s.toFetchThumbnails
  })

  const count = file?.count ?? 0
  const selectedOffsets = useMemo(
    function () {
      if (mode !== 'ranges' || !count) return new Set<number>()
      return new Set(parseRangesToOffsets(ranges, count))
    },
    [mode, ranges, count]
  )

  async function onSelectDir() {
    const selected = await dialogOpen({ directory: true, title: '选择输出目录' })
    if (typeof selected === 'string') toPatchSplit({ destDir: selected })
  }

  function onOffsetClick(offset: number) {
    if (mode !== 'ranges') return
    const next = toggleOffset(selectedOffsets, offset)
    toPatchSplit({ ranges: buildRangesFromOffsets([...next]) })
  }

  function offsetGroup(offset: number) {
    if (mode !== 'limit' || limit <= 0) return null
    return Math.floor(offset / limit)
  }

  const canSubmit =
    Boolean(destDir) && Boolean(file) && (mode === 'limit' ? limit > 0 : selectedOffsets.size > 0)

  const meta = !file
    ? '请先打开 PDF'
    : mode === 'ranges'
      ? `已选 ${selectedOffsets.size} / ${count} 页`
      : `每文件 ${limit} 页 · 共 ${count} 页`

  return (
    <OperationStage
      title="拆分 PDF"
      icon="ant-design:scissor-outlined"
      meta={meta}
      onBack={toCloseOperation}
      actions={
        mode === 'ranges' && selectedOffsets.size > 0 ? (
          <Button
            size="small"
            type="text"
            onClick={function () {
              toPatchSplit({ ranges: '' })
            }}>
            清空选中
          </Button>
        ) : null
      }
      fields={
        <>
          <Segmented
            size="small"
            value={mode}
            options={[
              { label: '页码范围', value: 'ranges' },
              { label: '固定页数', value: 'limit' }
            ]}
            onChange={function (value) {
              toPatchSplit({ mode: value as 'ranges' | 'limit' })
            }}
          />
          {mode === 'limit' ? (
            <InputNumber
              size="small"
              min={1}
              max={file?.count ?? 9999}
              value={limit}
              addonAfter="页/文件"
              onChange={function (value) {
                toPatchSplit({ limit: value ?? 1 })
              }}
            />
          ) : (
            <div className={styles.footerChips}>
              {RANGE_EXAMPLES.map(function (example) {
                return (
                  <button
                    key={example}
                    type="button"
                    className={styles.chip}
                    onClick={function () {
                      toPatchSplit({ ranges: example })
                    }}>
                    {example}
                  </button>
                )
              })}
            </div>
          )}
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
      hint={error ?? (canSubmit ? undefined : '完善输出与范围后即可拆分')}
      submitLabel="开始拆分"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onSubmit={function () {
        void toExecuteSplit()
      }}>
      {!file ? (
        <div className={styles.stageEmpty}>
          <Alert
            type="info"
            showIcon
            message="请先打开一个 PDF，再进行拆分"
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
      ) : (
        <PageBoard
          thumbnails={thumbnails}
          count={count}
          selectedOffsets={mode === 'ranges' ? selectedOffsets : undefined}
          resolveGroup={mode === 'limit' ? offsetGroup : undefined}
          isLoading={!thumbnails.length && !thumbnailsError}
          hasError={Boolean(thumbnailsError)}
          onRetry={function () {
            void toFetchThumbnails()
          }}
          onOffsetClick={onOffsetClick}
        />
      )}
    </OperationStage>
  )
}

export { SplitTask }
