import { Icon } from '@iconify/react/offline'
import { clsx } from 'clsx'
import { useEffect, useId, useState } from 'react'

import type { MenuItem } from '@/components/contextmenu'
import styles from '@/features/magnetic-tile/layout-menu.module.scss'
import { findMarkerBox } from '@/features/magnetic-tile/size'
import { useMirrorStore } from '@/stores/mirror'
import { mountOverlayTile, removeOverlayTile } from '@/views/overlay/tauri'

interface Tile {
  id: string
  component: MagneticTile.Component
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
  round: string | null
  background: MagneticTile.Background | null
}

interface Kind {
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
  label: string
}

interface PickerProps {
  tile: Tile
}

/** 形状缩略图固定按 size=1 比例绘制，避免随选项缩放导致菜单抖动 */
const THUMB_PREVIEW_SIZE = 1 as MagneticTile.Size
/** 形状缩略图短边 */
const THUMB_SHORT = 16
/** 大小行：lv1 边长，逐级 +STEP（各按钮固定，不随选中项变化） */
const THUMB_BASE = 8
const THUMB_STEP = 2

const SIZES: MagneticTile.Size[] = [1, 2, 3, 4]

const SHAPES: Kind[] = [
  { shape: 'square', direction: 'horizontal', label: '方形' },
  { shape: 'circle', direction: 'horizontal', label: '圆形' },
  { shape: 'rectangle', direction: 'horizontal', label: '横条' },
  { shape: 'rectangle', direction: 'vertical', label: '竖条' }
]

interface Draft {
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
}

function ShapeThumb(props: {
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
}) {
  const box = findMarkerBox({
    size: THUMB_PREVIEW_SIZE,
    shape: props.shape,
    direction: props.direction
  })
  const scale = THUMB_SHORT / Math.min(box.w, box.h)

  return (
    <span
      className={clsx(styles.thumb, styles[props.shape])}
      style={{
        width: Math.max(8, Math.round(box.w * scale)),
        height: Math.max(8, Math.round(box.h * scale))
      }}
      aria-hidden="true"
    />
  )
}

function SizeThumb(props: { size: MagneticTile.Size }) {
  const side = THUMB_BASE + (props.size - 1) * THUMB_STEP

  return (
    <span
      className={clsx(styles.thumb, styles.square)}
      style={{ width: side, height: side }}
      aria-hidden="true"
    />
  )
}

function isShapeActive(draft: Draft, kind: Kind) {
  if (draft.shape !== kind.shape) return false
  if (kind.shape === 'rectangle') return draft.direction === kind.direction
  return true
}

function findDirection(draft: Draft, kind: Kind): MagneticTile.Direction {
  if (kind.shape === 'rectangle') return kind.direction
  if (draft.shape === kind.shape) return draft.direction
  return 'horizontal'
}

function updateTile(tile: Tile, change: MagneticTile.Change) {
  if (!tile.id) return
  void useMirrorStore.getState().toUpdateMagneticTile([
    {
      key: tile.id,
      change
    }
  ])
}

function parseDraft(tile: Tile): Draft {
  return {
    size: tile.size,
    shape: tile.shape,
    direction: tile.direction
  }
}

function Picker(props: PickerProps) {
  const { tile } = props
  const [draft, setDraft] = useState(function () {
    return parseDraft(tile)
  })
  const sizeId = useId()
  const shapeId = useId()

  useEffect(
    function () {
      setDraft(parseDraft(tile))
    },
    [tile.size, tile.shape, tile.direction]
  )

  function onPickSize(value: MagneticTile.Size) {
    if (value === draft.size) return
    setDraft(function (prev) {
      return { ...prev, size: value }
    })
    updateTile(tile, { size: value })
  }

  function onPickShape(kind: Kind) {
    const direction = findDirection(draft, kind)
    const isSame =
      draft.shape === kind.shape &&
      (kind.shape !== 'rectangle' || draft.direction === direction)
    if (isSame) return
    setDraft(function (prev) {
      return { ...prev, shape: kind.shape, direction }
    })
    updateTile(tile, {
      shape: kind.shape,
      direction
    })
  }

  return (
    <div
      className={styles.picker}
      onPointerDown={function (event) {
        event.stopPropagation()
      }}>
      <div className={styles.section}>
        <div
          className={styles.caption}
          id={sizeId}>
          大小
        </div>
        <div
          className={styles.sizes}
          role="group"
          aria-labelledby={sizeId}>
          {SIZES.map(function (value) {
            const caption = `大小 ${value}`
            return (
              <button
                key={value}
                type="button"
                title={caption}
                aria-label={caption}
                aria-pressed={draft.size === value}
                className={clsx(styles.size, draft.size === value && styles.selected)}
                onClick={function () {
                  onPickSize(value)
                }}>
                <SizeThumb size={value} />
                <span className={styles.mark}>{value}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className={styles.section}>
        <div
          className={styles.caption}
          id={shapeId}>
          形状
        </div>
        <div
          className={styles.shapes}
          role="group"
          aria-labelledby={shapeId}>
          {SHAPES.map(function (kind) {
            const caption = kind.label
            return (
              <button
                key={`${kind.shape}-${kind.direction}`}
                type="button"
                title={caption}
                aria-label={caption}
                aria-pressed={isShapeActive(draft, kind)}
                className={clsx(styles.shape, isShapeActive(draft, kind) && styles.selected)}
                onClick={function () {
                  onPickShape(kind)
                }}>
                <ShapeThumb
                  shape={kind.shape}
                  direction={kind.direction}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function buildFloat(tile: Tile): MenuItem {
  const hasTile = Boolean(tile.id)

  return {
    key: 'float',
    label: '浮层',
    icon: (
      <Icon
        icon="ant-design:block-outlined"
        width={14}
        height={14}
      />
    ),
    children: [
      {
        key: 'float-mount',
        label: '添加',
        icon: (
          <Icon
            icon="ant-design:plus-outlined"
            width={14}
            height={14}
          />
        ),
        disabled: !hasTile,
        onSelect() {
          if (!tile.id) return
          void mountOverlayTile(tile.component, tile.id, {
            size: tile.size,
            shape: tile.shape,
            direction: tile.direction,
            round: tile.round,
            background: tile.background
          })
        }
      },
      {
        key: 'float-unmount',
        label: '移除',
        icon: (
          <Icon
            icon="ant-design:minus-outlined"
            width={14}
            height={14}
          />
        ),
        disabled: !hasTile,
        onSelect() {
          if (!tile.id) return
          void removeOverlayTile(tile.id)
        }
      }
    ]
  }
}

function buildItems(tile: Tile): MenuItem[] {
  return [buildFloat(tile)]
}

export { buildItems, Picker, styles }
export type { Tile }
