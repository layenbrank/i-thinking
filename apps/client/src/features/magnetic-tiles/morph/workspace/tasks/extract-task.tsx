import { save as dialogSave } from '@tauri-apps/plugin-dialog'
import { Alert, Button } from 'antd'
import { useEffect, useMemo } from 'react'

import { toggleOffset } from '@/features/magnetic-tiles/morph/workspace/tasks/page-ranges'
import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { OperationStage } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/operation-stage'
import { PageBoard } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/page-board'
import styles from '@/features/magnetic-tiles/morph/workspace/tasks/tasks.module.scss'
import { useMorphStore } from '@/stores/morph.ts'

function ExtractTask() {
  const file = useMorphStore(function (s) {
    return s.file
  })
  const thumbnails = useMorphStore(function (s) {
    return s.thumbnails
  })
  const thumbnailsError = useMorphStore(function (s) {
    return s.thumbnailsError
  })
  const selected = useMorphStore(function (s) {
    return s.extractModal.selected
  })
  const dest = useMorphStore(function (s) {
    return s.extractModal.dest
  })
  const loading = useMorphStore(function (s) {
    return s.extractModal.loading
  })
  const error = useMorphStore(function (s) {
    return s.extractModal.error
  })
  const closeOperation = useMorphStore(function (s) {
    return s.closeOperation
  })
  const patchExtract = useMorphStore(function (s) {
    return s.patchExtract
  })
  const executeExtract = useMorphStore(function (s) {
    return s.executeExtract
  })
  const openFilePicker = useMorphStore(function (s) {
    return s.openFilePicker
  })
  const fetchThumbnails = useMorphStore(function (s) {
    return s.fetchThumbnails
  })

  useEffect(
    function () {
      if (!file?.path) return
      if (!thumbnails.length && !thumbnailsError) void fetchThumbnails()
    },
    [file, thumbnails.length, thumbnailsError, fetchThumbnails]
  )

  const selectedOffsets = useMemo(
    function () {
      return new Set(selected)
    },
    [selected]
  )

  async function onSelectDest() {
    const selectedPath = await dialogSave({
      title: '选择抽取输出路径',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (typeof selectedPath === 'string') patchExtract({ dest: selectedPath })
  }

  function onOffsetClick(offset: number) {
    const next = toggleOffset(selectedOffsets, offset)
    patchExtract({
      selected: [...next].sort(function (a, b) {
        return a - b
      })
    })
  }

  const canSubmit = Boolean(file) && Boolean(dest) && selected.length > 0
  const meta = file
    ? `${file.path.split(/[\\/]/).pop()} · 已选 ${selected.length} 页`
    : '请先打开 PDF'

  return (
    <OperationStage
      title="抽取页面"
      icon="ant-design:export-outlined"
      meta={meta}
      onBack={closeOperation}
      actions={
        selected.length > 0 ? (
          <Button
            size="small"
            type="text"
            onClick={function () {
              patchExtract({ selected: [] })
            }}>
            清空选中
          </Button>
        ) : null
      }
      extra={
        <PathField
          compact
          label="输出文件"
          value={dest}
          placeholder="抽取结果保存路径"
          onBrowse={function () {
            void onSelectDest()
          }}
        />
      }
      hint={error ?? (canSubmit ? undefined : '点选页面并选择输出路径')}
      submitLabel="开始抽取"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onSubmit={function () {
        void executeExtract()
      }}>
      {!file ? (
        <div className={styles.stageEmpty}>
          <Alert
            type="info"
            showIcon
            message="请先打开一个 PDF"
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
          count={file.count}
          selectedOffsets={selectedOffsets}
          isLoading={!thumbnailsError && thumbnails.length === 0}
          hasError={Boolean(thumbnailsError)}
          onRetry={function () {
            void fetchThumbnails()
          }}
          onOffsetClick={onOffsetClick}
        />
      )}
    </OperationStage>
  )
}

export { ExtractTask }
