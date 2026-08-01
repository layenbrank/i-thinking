import { Icon } from '@iconify/react/offline'
import { App, Button, Empty, Select, Space, Tooltip, Typography } from 'antd'
import { clsx } from 'clsx'
import { memo, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Swiper, type SwiperClass, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, A11y, Virtual } from 'swiper/modules'
import { useShallow } from 'zustand/react/shallow'

import 'swiper/css'
import 'swiper/css/virtual'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

import type { BoothBucket } from '@/constants/marketplace/buckets'
import { findTileHint } from '@/constants/marketplace/tile-hints'
import { Reflection } from '@/features/controller/reflection.tsx'
import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { MarketplaceContext } from '@/features/magnetic-tiles/marketplace/workspace/context'
import { useEnterMotion } from '@/features/magnetic-tiles/marketplace/workspace/hooks/use-enter-motion'
import { useVisible } from '@/features/magnetic-tiles/marketplace/workspace/hooks/use-visible'
import { findLayoutKey, findMotionKey } from '@/features/magnetic-tiles/marketplace/workspace/lib/enter-motion'
import { insertTile } from '@/features/magnetic-tiles/marketplace/workspace/lib/insert-tile'
import {
  findBoothTiles,
  formatUpdatedAt
} from '@/features/magnetic-tiles/marketplace/workspace/lib/tiles'
import { useMirrorStore } from '@/stores/mirror.ts'

import SModule from '@/features/magnetic-tiles/marketplace/workspace/booth/section.module.scss'

type SectionProps = {
  bucket: BoothBucket
}

type SizeOption = {
  label: string
  value: Mirror.Size
}

type ShapeOption = {
  label: string
  value: Mirror.Shape
}

type DirectionOption = {
  label: string
  value: Mirror.Direction
}

type BoothCardViewProps = {
  tile: MagneticTile
  scrollRoot: Element | null
}

const SIZES: SizeOption[] = [1, 2, 3, 4, 5, 6, 7].map(function (value) {
  return { label: String(value), value: value as Mirror.Size }
})

const SHAPES: ShapeOption[] = [
  { label: '矩形', value: 'rectangle' },
  { label: '正形', value: 'square' },
  { label: '圆形', value: 'circle' }
]

const DIRECTIONS: DirectionOption[] = [
  { label: '水平', value: 'horizontal' },
  { label: '垂直', value: 'vertical' }
]

const BOOT_SIZE: Mirror.Size = 1
const BOOT_SHAPE: Mirror.Shape = 'rectangle'
const BOOT_DIRECTION: Mirror.Direction = 'horizontal'

function findTitleMark(title: string) {
  const trimmed = title.trim()
  if (!trimmed) return '#'
  return trimmed.slice(0, 1).toUpperCase()
}

function Section(props: SectionProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollRoot, onUpdateScrollRoot] = useState<Element | null>(null)
  const { query } = useContext(MarketplaceContext)
  const magneticTiles = useMirrorStore(function (state) {
    return state.magneticTiles
  })

  const featureTiles = useMemo(
    function () {
      return findBoothTiles(magneticTiles, props.bucket, query)
    },
    [magneticTiles, props.bucket, query]
  )

  const motionKey = useMemo(
    function () {
      return findMotionKey(props.bucket, query, featureTiles)
    },
    [props.bucket, query, featureTiles]
  )
  const layoutKey = useMemo(
    function () {
      return findLayoutKey(featureTiles)
    },
    [featureTiles]
  )

  useLayoutEffect(
    function () {
      onUpdateScrollRoot(listRef.current)
    },
    [props.bucket, featureTiles.length]
  )

  useEnterMotion(listRef, motionKey, layoutKey)

  return (
    <div className={clsx([SModule.section, SModule.root])}>
      {featureTiles.length === 0 ? (
        <div className={SModule.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={query.trim() ? '未找到匹配磁贴' : '该分类暂无磁贴'}
          />
        </div>
      ) : (
        <div
          ref={listRef}
          className={SModule.list}>
          {featureTiles.map(function (tile) {
            return (
              <BoothCard
                key={tile.id}
                tile={tile}
                scrollRoot={scrollRoot}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function BoothCardView(props: BoothCardViewProps) {
  const tile = props.tile
  const Component = Reflection[tile.component]
  const rootRef = useRef<HTMLElement>(null)
  const swiperRef = useRef<SwiperClass | null>(null)
  const isVisible = useVisible(rootRef, { root: props.scrollRoot })
  const [size, onUpdateSize] = useState(BOOT_SIZE)
  const [shape, onUpdateShape] = useState(BOOT_SHAPE)
  const [direction, onUpdateDirection] = useState(BOOT_DIRECTION)
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
  const hint = findTileHint(tile.component, tile.description)
  const mark = findTitleMark(tile.title)

  function onSlide(swiper: SwiperClass) {
    onUpdateSize(function (prev) {
      const value = SIZES.map(function (item) {
        return item.value
      })[swiper.realIndex]
      if (value) return value
      return prev
    })
  }

  function onChangeSize(value: Mirror.Size) {
    onUpdateSize(value)
    const index = SIZES.findIndex(function (item) {
      return item.value === value
    })
    if (index === -1) return
    swiperRef.current?.slideToLoop(index)
  }

  function onChangeShape(value: Mirror.Shape) {
    onUpdateShape(value)
  }

  function onChangeDirection(value: Mirror.Direction) {
    onUpdateDirection(value)
  }

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
        overrides: { size, shape, direction },
        toInsertMagneticTile
      })
      message.success(`已添加到 ${mirrorTitle}`)
    } catch (error) {
      console.error('[Marketplace] add booth tile failed:', error)
      message.error(error instanceof Error ? error.message : '添加失败')
    } finally {
      onUpdateAdding(false)
    }
  }

  return (
    <article
      ref={rootRef}
      data-list-card=""
      className={SModule.card}>
      <div className={SModule.meta}>
        <div className={SModule.head}>
          <div
            className={SModule.avatar}
            style={{
              backgroundColor: accent,
              color: tile.textColor ?? '#0F172A'
            }}
            aria-hidden>
            {mark}
          </div>
          <div className={SModule.copy}>
            <div className={SModule.titleRow}>
              <Typography.Text
                strong
                className={SModule.title}
                ellipsis={{ tooltip: tile.title }}>
                {tile.title}
              </Typography.Text>
              <span className={SModule.badge}>{tile.downloadCount}</span>
            </div>
            <Typography.Text
              className={SModule.description}
              ellipsis={{ tooltip: hint }}>
              {hint}
            </Typography.Text>
            <span className={SModule.updated}>{formatUpdatedAt(tile.updatedAt)}</span>
          </div>
        </div>

        <Space.Compact
          orientation="horizontal"
          className={SModule.controls}>
          <Select
            value={size}
            onChange={onChangeSize}
            options={SIZES}
            popupMatchSelectWidth={false}
          />
          <Select
            value={shape}
            onChange={onChangeShape}
            options={SHAPES}
            popupMatchSelectWidth={false}
          />
          <Select
            value={direction}
            onChange={onChangeDirection}
            options={DIRECTIONS}
            popupMatchSelectWidth={false}
          />
          <Tooltip title="新增到镜像">
            <Button
              type="primary"
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
        </Space.Compact>
      </div>

      {isVisible ? (
        <Swiper
          virtual
          navigation
          loop={true}
          spaceBetween={0}
          slidesPerView={1}
          onSwiper={function (swiper) {
            swiperRef.current = swiper
          }}
          onSlideChange={onSlide}
          scrollbar={{ draggable: true }}
          className={SModule.swiper}
          pagination={{ clickable: true }}
          modules={[Navigation, Pagination, A11y, Virtual]}>
          {SIZES.map(function (sizeOption) {
            return (
              <SwiperSlide
                key={sizeOption.value}
                className={clsx(SModule.slide, SModule[size], SModule[shape], SModule[direction])}>
                {sizeOption.value === size ? (
                  <MagneticTile.Suspense
                    size={size}
                    shape={shape}
                    direction={direction}>
                    <OverlayProvider>
                      <Component
                        {...tile}
                        size={size}
                        shape={shape}
                        direction={direction}
                      />
                    </OverlayProvider>
                  </MagneticTile.Suspense>
                ) : null}
              </SwiperSlide>
            )
          })}
        </Swiper>
      ) : (
        <div
          className={clsx(SModule.swiper, SModule.previewSlot)}
          aria-hidden
        />
      )}
    </article>
  )
}

const BoothCard = memo(BoothCardView)

export default Section
