import { Icon } from '@iconify/react/offline'
import { Button, Empty, Segmented, Skeleton, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { useState } from 'react'

import { useMorphStore } from '@/stores/morph.ts'
import Thumbnail from '@/features/magnetic-tiles/morph/workspace/thumbnail/thumbnail.tsx'
import styles from '@/features/magnetic-tiles/morph/workspace/navigation.module.scss'

// ─── Workspace tab ───────────────────────────────────────────────────────────

function WorkspaceSection() {
  const openFilePicker = useMorphStore((s) => s.openFilePicker)
  const switchFile = useMorphStore((s) => s.switchFile)
  const closeFile = useMorphStore((s) => s.closeFile)
  const file = useMorphStore((s) => s.file)
  const fileList = useMorphStore((s) => s.fileList)

  return (
    <div className={styles.workspaceSection}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={styles.workspaceHeader}>
        <span className={styles.workspaceLabel}>工作区</span>
        <Tooltip title="打开 PDF（支持多选）">
          <Button
            size="small"
            type="text"
            icon={
              <Icon
                icon="ant-design:plus-outlined"
                width={14}
                height={14}
              />
            }
            className={styles.addBtn}
            onClick={openFilePicker}
          />
        </Tooltip>
      </div>

      {/* ── File list ──────────────────────────────────────────── */}
      {fileList.length === 0 ? (
        <button
          type="button"
          className={styles.emptyCta}
          onClick={openFilePicker}>
          <Icon icon="ant-design:folder-open-outlined" width={14} height={14} />
          打开 PDF
        </button>
      ) : (
        <div className={styles.fileList}>
          {fileList.map((f) => {
            const name = f.path.split(/[\\/]/).pop() ?? f.path
            const isActive = f.path === file?.path
            return (
              <div
                key={f.path}
                className={clsx(styles.fileItem, isActive && styles.fileItemActive)}
                onClick={() => void switchFile(f.path)}>
                <Icon
                  icon="ant-design:file-outlined"
                  width={14}
                  height={14}
                  className={styles.fileItemIcon}
                />
                <div className={styles.fileItemBody}>
                  <div className={styles.fileItemName}>{name}</div>
                  <div className={styles.fileItemMeta}>{f.page_count} 页</div>
                </div>
                <button
                  className={styles.fileItemClose}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeFile(f.path)
                  }}>
                  <Icon icon="ant-design:close-outlined" width={12} height={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Pages tab ───────────────────────────────────────────────────────────────

function PagesSection() {
  const thumbnails = useMorphStore((s) => s.thumbnails)
  const currentPage = useMorphStore((s) => s.currentPage)
  const annotationCounts = useMorphStore((s) => s.annotationCounts)
  const pageCount = useMorphStore((s) => s.file?.page_count ?? 0)
  const setPage = useMorphStore((s) => s.setPage)
  const file = useMorphStore((s) => s.file)

  if (!file) {
    return (
      <Empty
        description="请先打开 PDF"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className={styles.empty}
      />
    )
  }

  if (!thumbnails.length) {
    return (
      <div className={styles.thumbLoading}>
        {Array.from({ length: Math.min(pageCount, 4) }).map((_, i) => (
          <Skeleton.Image
            key={i}
            active
            className={styles.skeletonThumb}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.thumbnailList}>
      <div className={styles.pageCount}>共 {pageCount} 页</div>
      {thumbnails.map((img) => (
        <Thumbnail
          key={img.page_index}
          image={img}
          pageIndex={img.page_index}
          isActive={img.page_index === currentPage}
          annotationCount={annotationCounts[img.page_index] ?? 0}
          onClick={() => setPage(img.page_index)}
        />
      ))}
    </div>
  )
}

// ─── Navigation root ──────────────────────────────────────────────────────────

export default function Navigation() {
  const [tab, setTab] = useState<'file' | 'page'>('file')

  return (
    <div className={clsx([styles.navigation, styles.root])}>
      <div className={styles.tabs}>
        <Segmented
          size="small"
          block
          value={tab}
          onChange={(v) => setTab(v as 'file' | 'page')}
          options={[
            { label: '文件', value: 'file', icon: <Icon icon="ant-design:file-outlined" width={14} height={14} /> },
            { label: '页面', value: 'page', icon: <Icon icon="ant-design:appstore-outlined" width={14} height={14} /> }
          ]}
          className={styles.tabSegment}
        />
      </div>
      <div className={styles.tabContent}>
        {tab === 'file' ? <WorkspaceSection /> : <PagesSection />}
      </div>
    </div>
  )
}
