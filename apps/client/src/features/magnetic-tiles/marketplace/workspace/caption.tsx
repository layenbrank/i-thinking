import { useContext, useEffect, useMemo, useState } from 'react'
import { Input, Select, Segmented } from 'antd'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'

import {
  findBoothBucketLabel,
  findNavigateBucketLabel
} from '@/constants/marketplace/buckets'
import { MagneticTile } from '@/features/magnetic-tile/magnetic-tile.tsx'
import {
  MarketplaceContext,
  type MarketplaceMode
} from '@/features/magnetic-tiles/marketplace/workspace/context'
import { CaptionActions } from '@/features/magnetic-tiles/marketplace/workspace/customize/caption-actions'
import {
  findBoothTiles,
  findNavigateTiles
} from '@/features/magnetic-tiles/marketplace/workspace/lib/tiles'
import { useMirrorStore } from '@/stores/mirror.ts'

import styles from '@/features/magnetic-tiles/marketplace/workspace/caption.module.scss'

type Meta = {
  label: string
  count: number
  unit: string
}

const MODES: Array<{ label: string; value: MarketplaceMode }> = [
  { label: '磁贴', value: 'booth' },
  { label: '网址', value: 'navigate' },
  { label: '定制', value: 'customize' }
]

const QUERY_DEBOUNCE_MS = 200

function matchMirrorTitle(input: string, option?: { title?: string; label?: unknown }) {
  const title = String(option?.title ?? option?.label ?? '')
  return title.toLowerCase().includes(input.trim().toLowerCase())
}

/** 市场 Overlay 顶栏：工具簇 · 搜索 · 元信息 / 操作 · 窗口控制 */
function Caption() {
  const {
    mode,
    onUpdateMode,
    boothBucket,
    navigateBucket,
    query,
    onUpdateQuery,
    targetMirrorID,
    onUpdateTargetMirrorID
  } = useContext(MarketplaceContext)
  const { mirrors, activeMirrorID, magneticTiles } = useMirrorStore(
    useShallow(function (state) {
      return {
        mirrors: state.mirrors,
        activeMirrorID: state.active.mirror?.id,
        magneticTiles: state.magneticTiles
      }
    })
  )
  const [searchDraft, onUpdateSearchDraft] = useState(query)

  useEffect(
    function () {
      if (targetMirrorID || !activeMirrorID) return
      onUpdateTargetMirrorID(activeMirrorID)
    },
    [activeMirrorID, targetMirrorID, onUpdateTargetMirrorID]
  )

  useEffect(
    function () {
      onUpdateSearchDraft(query)
    },
    [query]
  )

  useEffect(
    function () {
      if (searchDraft === query) return
      const timer = window.setTimeout(function () {
        onUpdateQuery(searchDraft)
      }, QUERY_DEBOUNCE_MS)
      return function () {
        window.clearTimeout(timer)
      }
    },
    [searchDraft, query, onUpdateQuery]
  )

  const meta = useMemo(function (): Meta | null {
    if (mode === 'booth') {
      return {
        label: findBoothBucketLabel(boothBucket),
        count: findBoothTiles(magneticTiles, boothBucket, query).length,
        unit: '磁贴'
      }
    }
    if (mode === 'navigate') {
      return {
        label: findNavigateBucketLabel(navigateBucket),
        count: findNavigateTiles(magneticTiles, navigateBucket, query).length,
        unit: '网址'
      }
    }
    return null
  }, [mode, boothBucket, navigateBucket, magneticTiles, query])

  const searchPlaceholder = mode === 'navigate' ? '搜索网址' : '搜索磁贴'

  return (
    <MagneticTile.Caption
      className={styles.caption}
      start={
        <div className={styles.chrome}>
          <div className={styles.tools}>
            <Select
              size="small"
              showSearch
              variant="borderless"
              className={styles.mirror}
              placeholder="选择镜像"
              value={targetMirrorID}
              onChange={function (value) {
                onUpdateTargetMirrorID(value)
              }}
              options={mirrors}
              fieldNames={{
                value: 'id',
                label: 'title'
              }}
              optionLabelProp="title"
              filterOption={matchMirrorTitle}
            />
            <span
              className={styles.divider}
              aria-hidden
            />
            <Segmented
              size="small"
              value={mode}
              options={MODES}
              className={styles.modes}
              onChange={function (value) {
                onUpdateSearchDraft('')
                onUpdateQuery('')
                onUpdateMode(value as MarketplaceMode)
              }}
            />
            {mode !== 'customize' ? (
              <Input.Search
                allowClear
                size="small"
                value={searchDraft}
                placeholder={searchPlaceholder}
                className={styles.search}
                onChange={function (event) {
                  onUpdateSearchDraft(event.target.value)
                }}
                onSearch={function (value) {
                  onUpdateSearchDraft(value)
                  onUpdateQuery(value)
                }}
              />
            ) : null}
          </div>
          {meta ? (
            <div className={clsx(styles.meta)}>
              <span className={styles.metaLabel}>{meta.label}</span>
              <span className={styles.metaSep}>·</span>
              <span className={styles.metaCount}>
                共 {meta.count} 个{meta.unit}
              </span>
            </div>
          ) : null}
        </div>
      }
      actions={mode === 'customize' ? <CaptionActions /> : null}
    />
  )
}

export { Caption }
