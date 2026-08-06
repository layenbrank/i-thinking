import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { Alert, Button, InputNumber, Segmented } from 'antd'
import { useMemo } from 'react'

import {
  buildRangesFromIndexes,
  parseRangesToIndexes,
  toggleIndex
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
  const thumbnails = useMorphStore(function (s) {
    return s.thumbnails
  })
  const thumbnailsError = useMorphStore(function (s) {
    return s.thumbnailsError
  })
  const closeOperation = useMorphStore(function (s) {
    return s.closeOperation
  })
  const setSplitModal = useMorphStore(function (s) {
    return s.setSplitModal
  })
  const executeSplit = useMorphStore(function (s) {
    return s.executeSplit
  })
  const openFilePicker = useMorphStore(function (s) {
    return s.openFilePicker
  })
  const loadThumbnails = useMorphStore(function (s) {
    return s.loadThumbnails
  })

  const pageCount = file?.page_count ?? 0
  const selectedPages = useMemo(
    function () {
      if (mode !== 'ranges' || !pageCount) return new Set<number>()
      return new Set(parseRangesToIndexes(ranges, pageCount))
    },
    [mode, ranges, pageCount]
  )

  async function onSelectDir() {
    const selected = await dialogOpen({ directory: true, title: '选择输出目录' })
    if (typeof selected === 'string') setSplitModal({ destDir: selected })
  }

  function onPageClick(pageIndex: number) {
    if (mode !== 'ranges') return
    const next = toggleIndex(selectedPages, pageIndex)
    setSplitModal({ ranges: buildRangesFromIndexes([...next]) })
  }

  function pageGroup(pageIndex: number) {
    if (mode !== 'count' || count <= 0) return null
    return Math.floor(pageIndex / count)
  }

  const canSubmit =
    Boolean(destDir) &&
    Boolean(file) &&
    (mode === 'count' ? count > 0 : selectedPages.size > 0)

  const meta = !file
    ? '请先打开 PDF'
    : mode === 'ranges'
      ? `已选 ${selectedPages.size} / ${pageCount} 页`
      : `每文件 ${count} 页 · 共 ${pageCount} 页`

  return (
    <OperationStage
      title="拆分 PDF"
      icon="ant-design:scissor-outlined"
      meta={meta}
      onBack={closeOperation}
      actions={
        mode === 'ranges' && selectedPages.size > 0 ? (
          <Button
            size="small"
            type="text"
            onClick={function () {
              setSplitModal({ ranges: '' })
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
              { label: '固定页数', value: 'count' }
            ]}
            onChange={function (value) {
              setSplitModal({ mode: value as 'ranges' | 'count' })
            }}
          />
          {mode === 'count' ? (
            <InputNumber
              size="small"
              min={1}
              max={file?.page_count ?? 9999}
              value={count}
              addonAfter="页/文件"
              onChange={function (value) {
                setSplitModal({ count: value ?? 1 })
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
                      setSplitModal({ ranges: example })
                    }}>
                    {example}
                  </button>
                )
              })}
            </div>
          )}
          <PathField
            compact
            label="输出目录"
            value={destDir}
            placeholder="选择输出目录"
            onBrowse={function () {
              void onSelectDir()
            }}
          />
        </>
      }
      hint={error ?? (canSubmit ? undefined : '完善输出与范围后即可拆分')}
      submitLabel="开始拆分"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onSubmit={function () {
        void executeSplit()
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
                  void openFilePicker()
                }}>
                打开 PDF
              </Button>
            }
          />
        </div>
      ) : (
        <PageBoard
          thumbnails={thumbnails}
          pageCount={pageCount}
          selectedPages={mode === 'ranges' ? selectedPages : undefined}
          resolveGroup={mode === 'count' ? pageGroup : undefined}
          isLoading={!thumbnailsError && thumbnails.length === 0}
          hasError={Boolean(thumbnailsError)}
          onRetry={function () {
            void loadThumbnails()
          }}
          onPageClick={onPageClick}
        />
      )}
    </OperationStage>
  )
}

export { SplitTask }
