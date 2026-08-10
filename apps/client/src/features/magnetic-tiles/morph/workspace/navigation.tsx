import { Icon } from '@iconify/react/offline'
import { Button, Empty, Segmented, Skeleton, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { useState } from 'react'

import styles from '@/features/magnetic-tiles/morph/workspace/navigation.module.scss'
import Thumbnail from '@/features/magnetic-tiles/morph/workspace/thumbnail/thumbnail.tsx'
import { useMorphStore } from '@/stores/morph.ts'
import { CSSVAR } from '@/themes'

function WorkspaceSection() {
  const toOpenFilePicker = useMorphStore(function (s) {
    return s.toOpenFilePicker
  })
  const toSwitchFile = useMorphStore(function (s) {
    return s.toSwitchFile
  })
  const toCloseFile = useMorphStore(function (s) {
    return s.toCloseFile
  })
  const file = useMorphStore(function (s) {
    return s.file
  })
  const files = useMorphStore(function (s) {
    return s.files
  })

  return (
    <div className={styles.workspaceSection}>
      <div className={styles.workspaceHeader}>
        <span className={styles.workspaceLabel}>工作区</span>
        <Tooltip title="打开 PDF（支持多选）">
          <Button
            type="text"
            className={styles.addBtn}
            aria-label="打开 PDF"
            icon={
              <Icon
                icon="mdi:plus"
                width={14}
                height={14}
              />
            }
            onClick={toOpenFilePicker}
          />
        </Tooltip>
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          className={styles.emptyCta}
          onClick={toOpenFilePicker}>
          <Icon
            icon="mdi:folder-open"
            width={16}
            height={16}
            className={styles.emptyCtaIcon}
          />
          打开 PDF
        </button>
      ) : (
        <div className={styles.fileList}>
          {files.map(function (f) {
            const name = f.path.split(/[\\/]/).pop() ?? f.path
            const isActive = f.path === file?.path
            return (
              <div
                key={f.path}
                role="button"
                tabIndex={0}
                className={clsx(styles.fileItem, isActive && styles.fileItemActive)}
                onClick={function () {
                  void toSwitchFile(f.path)
                }}
                onKeyDown={function (e) {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void toSwitchFile(f.path)
                  }
                }}>
                <span
                  className={styles.fileItemBadge}
                  aria-hidden>
                  <Icon
                    icon="mdi:file-pdf-box"
                    width={18}
                    height={18}
                  />
                </span>
                <div className={styles.fileItemBody}>
                  <div className={styles.fileItemName}>{name}</div>
                  <div className={styles.fileItemMeta}>{f.count} 页</div>
                </div>
                <button
                  type="button"
                  className={styles.fileItemClose}
                  aria-label="关闭文件"
                  onClick={function (e) {
                    e.stopPropagation()
                    toCloseFile(f.path)
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
  const offset = useMorphStore(function (s) {
    return s.offset
  })
  const annCounts = useMorphStore(function (s) {
    return s.annCounts
  })
  const count = useMorphStore(function (s) {
    return s.file?.count ?? 0
  })
  const toSeekOffset = useMorphStore(function (s) {
    return s.toSeekOffset
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
        {Array.from({ length: Math.min(count, 4) }).map(function (_, i) {
          return (
            <div
              key={i}
              className={styles.skeletonThumb}>
              <Skeleton.Image
                active
                className="size-full"
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.thumbnailList}>
      <div className={styles.pageCount}>共 {count} 页</div>
      {thumbnails.map(function (img, index) {
        const thumbOffset = Number.isFinite(img.offset) ? img.offset : index
        return (
          <Thumbnail
            key={`${file.path}:${thumbOffset}`}
            image={img}
            offset={thumbOffset}
            isActive={thumbOffset === offset}
            annotationCount={annCounts[thumbOffset] ?? 0}
            onClick={function () {
              toSeekOffset(thumbOffset, { source: 'thumb' })
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
    <div className={clsx(styles.navigation, styles.root, CSSVAR.KEY)}>
      <div className={styles.tabs}>
        <Segmented
          size="middle"
          block
          value={tab}
          onChange={function (v) {
            onUpdateTab(v as 'file' | 'page')
          }}
          options={[
            {
              value: 'file',
              title: '文件',
              label: (
                <span className={styles.segmentLabel}>
                  <span
                    className={styles.segBadge}
                    data-tone="file"
                    aria-hidden>
                    <Icon
                      icon="mdi:file-document-box"
                      width={14}
                      height={14}
                    />
                  </span>
                  <span className={styles.segText}>文件</span>
                </span>
              )
            },
            {
              value: 'page',
              title: '页面',
              label: (
                <span className={styles.segmentLabel}>
                  <span
                    className={styles.segBadge}
                    data-tone="page"
                    aria-hidden>
                    <Icon
                      icon="mdi:view-grid"
                      width={14}
                      height={14}
                    />
                  </span>
                  <span className={styles.segText}>页面</span>
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
