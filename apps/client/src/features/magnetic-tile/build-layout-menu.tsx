import { Icon } from '@iconify/react'
import type { ReactNode } from 'react'

import type { MenuItem } from '@/components/contextmenu'
import { useMirrorStore } from '@/stores/mirror'
import { isOverlayTileKind } from '@/stores/overlay'
import { mountOverlayTile, removeOverlayTile } from '@/views/overlay/tauri'

interface LayoutSection {
  id: string
  component: MagneticTile.Component
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
}

const SIZES: MagneticTile.Size[] = [1, 2, 3, 4, 5, 6, 7]

const SHAPES: { value: MagneticTile.Shape; label: string }[] = [
  { value: 'square', label: '方形' },
  { value: 'circle', label: '圆形' },
  { value: 'rectangle', label: '矩形' }
]

const DIRECTIONS: { value: MagneticTile.Direction; label: string }[] = [
  { value: 'horizontal', label: '横向' },
  { value: 'vertical', label: '纵向' }
]

function CheckIcon() {
  return (
    <Icon
      icon="ant-design:check-outlined"
      width={14}
      height={14}
    />
  )
}

function EmptyIcon() {
  return (
    <span
      style={{ width: 14, height: 14, display: 'inline-block' }}
      aria-hidden="true"
    />
  )
}

function findCheckIcon(isActive: boolean): ReactNode {
  return isActive ? <CheckIcon /> : <EmptyIcon />
}

function updateLayout(section: LayoutSection, change: MagneticTile.Change) {
  void useMirrorStore.getState().toUpdateMagneticTile([
    {
      key: section.id,
      change
    }
  ])
}

function buildFloatMenuItems(section: LayoutSection): MenuItem {
  const canMountTile = isOverlayTileKind(section.component)

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
        disabled: !canMountTile,
        onSelect() {
          if (!isOverlayTileKind(section.component) || !section.id) return
          void mountOverlayTile(section.component, section.id, {
            size: section.size,
            shape: section.shape,
            direction: section.direction
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
        disabled: !canMountTile,
        onSelect() {
          if (!isOverlayTileKind(section.component) || !section.id) return
          void removeOverlayTile(section.id)
        }
      }
    ]
  }
}

function buildLayoutMenuItems(section: LayoutSection): MenuItem[] {
  return [
    {
      key: 'size',
      label: '大小',
      icon: (
        <Icon
          icon="ant-design:column-height-outlined"
          width={14}
          height={14}
        />
      ),
      children: SIZES.map(function (size) {
        return {
          key: `size-${size}`,
          label: String(size),
          icon: findCheckIcon(section.size === size),
          onSelect() {
            updateLayout(section, { size })
          }
        }
      })
    },
    {
      key: 'shape',
      label: '形状',
      icon: (
        <Icon
          icon="ant-design:border-outlined"
          width={14}
          height={14}
        />
      ),
      children: SHAPES.map(function (item) {
        return {
          key: `shape-${item.value}`,
          label: item.label,
          icon: findCheckIcon(section.shape === item.value),
          onSelect() {
            updateLayout(section, { shape: item.value })
          }
        }
      })
    },
    {
      key: 'direction',
      label: '方向',
      icon: (
        <Icon
          icon="ant-design:swap-outlined"
          width={14}
          height={14}
        />
      ),
      children: DIRECTIONS.map(function (item) {
        return {
          key: `direction-${item.value}`,
          label: item.label,
          icon: findCheckIcon(section.direction === item.value),
          onSelect() {
            updateLayout(section, { direction: item.value })
          }
        }
      })
    },
    { type: 'divider' },
    buildFloatMenuItems(section)
  ]
}

export { buildLayoutMenuItems }
export type { LayoutSection }
