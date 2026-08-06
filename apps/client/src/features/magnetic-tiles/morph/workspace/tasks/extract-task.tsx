import { save as dialogSave } from '@tauri-apps/plugin-dialog'
import { Alert, Button } from 'antd'
import { useEffect, useMemo } from 'react'

import { toggleIndex } from '@/features/magnetic-tiles/morph/workspace/tasks/page-ranges'
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
  const setExtractModal = useMorphStore(function (s) {
    return s.setExtractModal
  })
  const executeExtract = useMorphStore(function (s) {
    return s.executeExtract
  })
  const openFilePicker = useMorphStore(function (s) {
    return s.openFilePicker
  })
  const loadThumbnails = useMorphStore(function (s) {
    return s.loadThumbnails
  })

  useEffect(
    function () {
      if (!file?.path) return
      if (!thumbnails.length && !thumbnailsError) void loadThumbnails()
    },
    [file, thumbnails.length, thumbnailsError, loadThumbnails]
  )

  const selectedPages = useMemo(
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
    if (typeof selectedPath === 'string') setExtractModal({ dest: selectedPath })
  }

  function onPageClick(pageIndex: number) {
    const next = toggleIndex(selectedPages, pageIndex)
    setExtractModal({
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
              setExtractModal({ selected: [] })
            }}>
            清空选中
          </Button>
        ) : null
      }
      fields={
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
          pageCount={file.page_count}
          selectedPages={selectedPages}
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

export { ExtractTask }
