import { Icon } from '@iconify/react/offline'
import { Button, Empty, Segmented, Skeleton, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { useState } from 'react'

import { useMorphStore } from '@/stores/morph.ts'
import Thumbnail from '@/features/magnetic-tiles/morph/workspace/thumbnail/thumbnail.tsx'
import styles from '@/features/magnetic-tiles/morph/workspace/navigation.module.scss'

function WorkspaceSection() {
  const openFilePicker = useMorphStore(function (s) {
    return s.openFilePicker
  })
  const switchFile = useMorphStore(function (s) {
    return s.switchFile
  })
  const closeFile = useMorphStore(function (s) {
    return s.closeFile
  })
  const file = useMorphStore(function (s) {
    return s.file
  })
  const fileList = useMorphStore(function (s) {
    return s.fileList
  })

  return (
    <div className={styles.workspaceSection}>
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

      {fileList.length === 0 ? (
        <button
          type="button"
          className={styles.emptyCta}
          onClick={openFilePicker}>
          <Icon
            icon="ant-design:folder-open-outlined"
            width={14}
            height={14}
          />
          打开 PDF
        </button>
      ) : (
        <div className={styles.fileList}>
          {fileList.map(function (f) {
            const name = f.path.split(/[\\/]/).pop() ?? f.path
            const isActive = f.path === file?.path
            return (
              <div
                key={f.path}
                role="button"
                tabIndex={0}
                className={clsx(styles.fileItem, isActive && styles.fileItemActive)}
                onClick={function () {
                  void switchFile(f.path)
                }}
                onKeyDown={function (e) {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void switchFile(f.path)
                  }
                }}>
                <Icon
                  icon="ant-design:file-pdf-outlined"
                  width={14}
                  height={14}
                  className={styles.fileItemIcon}
                />
                <div className={styles.fileItemBody}>
                  <div className={styles.fileItemName}>{name}</div>
                  <div className={styles.fileItemMeta}>{f.page_count} 页</div>
                </div>
                <button
                  type="button"
                  className={styles.fileItemClose}
                  aria-label="关闭文件"
                  onClick={function (e) {
                    e.stopPropagation()
                    closeFile(f.path)
                  }}>
                  <Icon
                    icon="ant-design:close-outlined"
                    width={12}
                    height={12}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PagesSection() {
  const thumbnails = useMorphStore(function (s) {
    return s.thumbnails
  })
  const currentPage = useMorphStore(function (s) {
    return s.currentPage
  })
  const annotationCounts = useMorphStore(function (s) {
    return s.annotationCounts
  })
  const pageCount = useMorphStore(function (s) {
    return s.file?.page_count ?? 0
  })
  const setPage = useMorphStore(function (s) {
    return s.setPage
  })
  const file = useMorphStore(function (s) {
    return s.file
  })

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
        {Array.from({ length: Math.min(pageCount, 4) }).map(function (_, i) {
          return (
            <Skeleton.Image
              key={i}
              active
              className={styles.skeletonThumb}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.thumbnailList}>
      <div className={styles.pageCount}>共 {pageCount} 页</div>
      {thumbnails.map(function (img) {
        return (
          <Thumbnail
            key={img.page_index}
            image={img}
            pageIndex={img.page_index}
            isActive={img.page_index === currentPage}
            annotationCount={annotationCounts[img.page_index] ?? 0}
            onClick={function () {
              setPage(img.page_index)
            }}
          />
        )
      })}
    </div>
  )
}

export default function Navigation() {
  const [tab, onUpdateTab] = useState<'file' | 'page'>('file')

  return (
    <div className={clsx(styles.navigation, styles.root)}>
      <div className={styles.tabs}>
        <Segmented
          size="small"
          block
          value={tab}
          onChange={function (v) {
            onUpdateTab(v as 'file' | 'page')
          }}
          options={[
            {
              value: 'file',
              label: (
                <span className={styles.segmentLabel}>
                  <Icon
                    icon="ant-design:file-outlined"
                    width={14}
                    height={14}
                    aria-hidden
                  />
                  文件
                </span>
              )
            },
            {
              value: 'page',
              label: (
                <span className={styles.segmentLabel}>
                  <Icon
                    icon="ant-design:appstore-outlined"
                    width={14}
                    height={14}
                    aria-hidden
                  />
                  页面
                </span>
              )
            }
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
