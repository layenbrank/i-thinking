import { Icon } from '@iconify/react/offline'
import { save as dialogSave } from '@tauri-apps/plugin-dialog'
import { Alert, Button, Modal } from 'antd'
import { useEffect, useMemo } from 'react'

import { toggleIndex } from '@/features/magnetic-tiles/morph/workspace/tasks/page-ranges'
import { PathField } from '@/features/magnetic-tiles/morph/workspace/tasks/path-field'
import { OperationStage } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/operation-stage'
import { PageBoard } from '@/features/magnetic-tiles/morph/workspace/tasks/stage/page-board'
import styles from '@/features/magnetic-tiles/morph/workspace/tasks/tasks.module.scss'
import { useMorphStore } from '@/stores/morph.ts'

function OrganizeTask() {
  const file = useMorphStore(function (s) {
    return s.file
  })
  const thumbnails = useMorphStore(function (s) {
    return s.thumbnails
  })
  const thumbnailsError = useMorphStore(function (s) {
    return s.thumbnailsError
  })
  const order = useMorphStore(function (s) {
    return s.organizeModal.order
  })
  const selected = useMorphStore(function (s) {
    return s.organizeModal.selected
  })
  const dest = useMorphStore(function (s) {
    return s.organizeModal.dest
  })
  const loading = useMorphStore(function (s) {
    return s.organizeModal.loading
  })
  const error = useMorphStore(function (s) {
    return s.organizeModal.error
  })
  const closeOperation = useMorphStore(function (s) {
    return s.closeOperation
  })
  const setOrganizeModal = useMorphStore(function (s) {
    return s.setOrganizeModal
  })
  const executeOrganize = useMorphStore(function (s) {
    return s.executeOrganize
  })
  const openFilePicker = useMorphStore(function (s) {
    return s.openFilePicker
  })
  const loadThumbnails = useMorphStore(function (s) {
    return s.loadThumbnails
  })

  useEffect(
    function () {
      const pageCount = file?.page_count ?? 0
      if (!pageCount) return
      if (order.length === pageCount) return
      setOrganizeModal({
        order: Array.from({ length: pageCount }, function (_, i) {
          return i
        }),
        selected: []
      })
      if (!thumbnails.length) void loadThumbnails()
    },
    [file?.page_count, file?.path, order.length, setOrganizeModal, thumbnails.length, loadThumbnails]
  )

  const pagesInOrder = useMemo(
    function () {
      if (!order.length) return thumbnails
      const byIndex = new Map(
        thumbnails.map(function (image) {
          return [image.page_index, image] as const
        })
      )
      return order
        .map(function (pageIndex) {
          return byIndex.get(pageIndex)
        })
        .filter(Boolean) as Morph.PageImage[]
    },
    [order, thumbnails]
  )

  const selectedPages = useMemo(
    function () {
      return new Set(selected)
    },
    [selected]
  )

  async function onSelectDest() {
    const selectedPath = await dialogSave({
      title: '选择整理后的输出路径',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (typeof selectedPath === 'string') setOrganizeModal({ dest: selectedPath })
  }

  function onPageClick(pageIndex: number) {
    const next = toggleIndex(selectedPages, pageIndex)
    setOrganizeModal({ selected: [...next] })
  }

  /** 按当前 order 位置移动，跳过同属选中的邻居 */
  function onMoveSelected(delta: number) {
    if (!selected.length) return
    const next = order.slice()
    const selectedSet = new Set(selected)
    const positions = selected
      .map(function (pageIndex) {
        return next.indexOf(pageIndex)
      })
      .filter(function (i) {
        return i >= 0
      })
      .sort(function (a, b) {
        return delta < 0 ? a - b : b - a
      })
    for (const index of positions) {
      const target = index + delta
      if (target < 0 || target >= next.length) continue
      if (selectedSet.has(next[target])) continue
      const temp = next[index]
      next[index] = next[target]
      next[target] = temp
    }
    setOrganizeModal({ order: next })
  }

  function onConfirmDelete() {
    Modal.confirm({
      title: '删除选中页面？',
      content: `将删除 ${selected.length} 页并写入输出文件，此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        return executeOrganize('delete')
      }
    })
  }

  const canSubmit = Boolean(file) && Boolean(dest) && order.length > 0
  const canPageOp = Boolean(dest) && selected.length > 0 && !loading
  const meta = file
    ? `${file.path.split(/[\\/]/).pop()} · 已选 ${selected.length} / ${file.page_count} 页`
    : '请先打开 PDF'

  return (
    <OperationStage
      title="整理页面"
      icon="ant-design:appstore-outlined"
      meta={meta}
      onBack={closeOperation}
      actions={
        <>
          <Button
            size="small"
            type="text"
            disabled={!selected.length}
            icon={
              <Icon
                icon="ant-design:arrow-up-outlined"
                width={14}
                height={14}
              />
            }
            onClick={function () {
              onMoveSelected(-1)
            }}>
            上移
          </Button>
          <Button
            size="small"
            type="text"
            disabled={!selected.length}
            icon={
              <Icon
                icon="ant-design:arrow-down-outlined"
                width={14}
                height={14}
              />
            }
            onClick={function () {
              onMoveSelected(1)
            }}>
            下移
          </Button>
          <Button
            size="small"
            type="text"
            disabled={!canPageOp}
            icon={
              <Icon
                icon="ant-design:rotate-right-outlined"
                width={14}
                height={14}
              />
            }
            onClick={function () {
              void executeOrganize('rotate')
            }}>
            旋转
          </Button>
          <Button
            size="small"
            type="text"
            danger
            disabled={!canPageOp}
            icon={
              <Icon
                icon="ant-design:delete-outlined"
                width={14}
                height={14}
              />
            }
            onClick={onConfirmDelete}>
            删除
          </Button>
        </>
      }
      fields={
        <PathField
          compact
          label="输出文件"
          value={dest}
          placeholder="整理结果保存路径"
          onBrowse={function () {
            void onSelectDest()
          }}
        />
      }
      hint={error ?? (canSubmit ? undefined : '选择输出路径后保存重排')}
      submitLabel="保存重排"
      submitDisabled={!canSubmit}
      submitLoading={loading}
      onSubmit={function () {
        void executeOrganize('reorder')
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
          thumbnails={pagesInOrder}
          pageCount={file.page_count}
          selectedPages={selectedPages}
          pageLabel={function (_pageIndex, gridIndex) {
            return String(gridIndex + 1)
          }}
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

export { OrganizeTask }
