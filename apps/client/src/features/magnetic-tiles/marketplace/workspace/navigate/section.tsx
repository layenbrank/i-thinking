import { Icon } from '@iconify/react/offline'
import { App, Button, Empty, Tooltip, Typography } from 'antd'
import { clsx } from 'clsx'
import { memo, useContext, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import {
  findNavigateBucket,
  findNavigateBucketLabel,
  type NavigateBucket
} from '@/constants/marketplace/buckets'
import { MarketplaceContext } from '@/features/magnetic-tiles/marketplace/workspace/context'
import { useEnterMotion } from '@/features/magnetic-tiles/marketplace/workspace/hooks/use-enter-motion'
import { findLayoutKey, findMotionKey } from '@/features/magnetic-tiles/marketplace/workspace/lib/enter-motion'
import { insertTile } from '@/features/magnetic-tiles/marketplace/workspace/lib/insert-tile'
import {
  findNavigateTiles,
  formatUpdatedAt
} from '@/features/magnetic-tiles/marketplace/workspace/lib/tiles'
import { useMirrorStore } from '@/stores/mirror.ts'

import SModule from '@/features/magnetic-tiles/marketplace/workspace/navigate/section.module.scss'

type SectionProps = {
  bucket: NavigateBucket
}

type NavigateCardViewProps = {
  tile: MagneticTile
}

function parseHostname(url: string | null) {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function findTitleMark(title: string) {
  const trimmed = title.trim()
  if (!trimmed) return '#'
  return trimmed.slice(0, 1).toUpperCase()
}

function findTileDescription(tile: MagneticTile) {
  if (tile.description && tile.description !== tile.title) {
    return tile.description
  }
  const bucket = findNavigateBucket(tile)
  return `${findNavigateBucketLabel(bucket)}类网站`
}

function Section(props: SectionProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const { query } = useContext(MarketplaceContext)
  const magneticTiles = useMirrorStore(function (state) {
    return state.magneticTiles
  })

  const navigationTiles = useMemo(
    function () {
      return findNavigateTiles(magneticTiles, props.bucket, query)
    },
    [magneticTiles, props.bucket, query]
  )

  const motionKey = useMemo(
    function () {
      return findMotionKey(props.bucket, query, navigationTiles)
    },
    [props.bucket, query, navigationTiles]
  )
  const layoutKey = useMemo(
    function () {
      return findLayoutKey(navigationTiles)
    },
    [navigationTiles]
  )

  useEnterMotion(gridRef, motionKey, layoutKey)

  return (
    <div className={clsx([SModule.section, SModule.root])}>
      {navigationTiles.length === 0 ? (
        <div className={SModule.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={query.trim() ? '未找到匹配网址' : '该分类暂无网址'}
          />
        </div>
      ) : (
        <div
          ref={gridRef}
          className={SModule.grid}>
          {navigationTiles.map(function (tile) {
            return (
              <NavigateCard
                key={tile.id}
                tile={tile}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function NavigateCardView(props: NavigateCardViewProps) {
  const tile = props.tile
  const [isAdding, onUpdateAdding] = useState(false)
  const { message } = App.useApp()
  const { targetMirrorID } = useContext(MarketplaceContext)
  const { activeMirrorID, mirrors, toInsertMagneticTile } = useMirrorStore(
    useShallow(function (state) {
      return {
        activeMirrorID: state.active.mirror?.id,
        mirrors: state.mirrors,
        toInsertMagneticTile: state.toInsertMagneticTile
      }
    })
  )
  const accent = tile.background?.color ?? '#DBEAFE'
  const hostname = parseHostname(tile.url)
  const mark = findTitleMark(tile.title)
  const description = findTileDescription(tile)
  const updatedLabel = formatUpdatedAt(tile.updatedAt)

  async function onAdd() {
    const mirrorID = targetMirrorID ?? activeMirrorID
    if (!mirrorID) {
      message.warning('请先选择镜像')
      return
    }

    const mirror = mirrors.find(function (item) {
      return item.id === mirrorID
    })
    const mirrorTitle = mirror?.title ?? '镜像'

    onUpdateAdding(true)
    try {
      await insertTile({
        tile,
        mirrorID,
        toInsertMagneticTile
      })
      message.success(`已添加到 ${mirrorTitle}`)
    } catch (error) {
      console.error('[Marketplace] add navigate tile failed:', error)
      message.error(error instanceof Error ? error.message : '添加失败')
    } finally {
      onUpdateAdding(false)
    }
  }

  return (
    <article
      data-list-card=""
      className={SModule.card}>
      <div
        className={SModule.avatar}
        style={{
          backgroundColor: accent,
          color: tile.textColor ?? '#0F172A'
        }}
        aria-hidden>
        {mark}
      </div>

      <div className={SModule.body}>
        <Typography.Text
          strong
          className={SModule.title}
          ellipsis={{ tooltip: tile.title }}>
          {tile.title}
        </Typography.Text>
        <Typography.Text
          className={SModule.description}
          ellipsis={{ tooltip: description }}>
          {description}
        </Typography.Text>
        <div className={SModule.metaRow}>
          {hostname ? (
            <Typography.Link
              href={tile.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={SModule.host}
              ellipsis
              onClick={function (event) {
                event.stopPropagation()
              }}>
              {hostname}
            </Typography.Link>
          ) : null}
          <span className={SModule.updated}>{updatedLabel}</span>
        </div>
      </div>

      <div className={SModule.aside}>
        <span className={SModule.badge}>{tile.downloadCount}</span>
        <Tooltip title="新增到镜像">
          <Button
            type="primary"
            size="small"
            loading={isAdding}
            aria-label={`新增 ${tile.title}`}
            className={clsx(SModule.add, 'cursor-pointer')}
            onClick={function (event) {
              event.stopPropagation()
              void onAdd()
            }}
            icon={
              <Icon
                icon="ant-design:plus-outlined"
                width={14}
                height={14}
              />
            }
          />
        </Tooltip>
      </div>
    </article>
  )
}

const NavigateCard = memo(NavigateCardView)

export default Section
