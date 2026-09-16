import { Icon } from '@iconify/react/offline'

import type { MenuItem } from '@/components/contextmenu'
import { LayoutPicker, type Tile } from '@/features/magnetic-tile/layout-menu'

/**
 * 磁贴右键菜单的**构建**部分（`.tsx` 但不定义组件：Fast Refresh 只要求「组件文件的导出都是组件」）。
 *
 * 只导出 `buildItems` 一个值 —— 导出名全小写时规则不会把它当组件，本文件就不算组件文件；
 * 一旦再导出 PascalCase 的值（如 `CLASS_NAMES`），规则会认为文件里既有组件又有普通导出而报警。
 */

/** 右键菜单占位动作，后续接真实逻辑 */
const ACTIONS: MenuItem[] = [
  {
    key: 'rename',
    label: '重命名',
    icon: (
      <Icon
        icon="ant-design:edit-outlined"
        width={14}
        height={14}
      />
    )
  },
  {
    key: 'copy',
    label: '复制',
    icon: (
      <Icon
        icon="ant-design:copy-outlined"
        width={14}
        height={14}
      />
    )
  },
  {
    key: 'remove',
    label: '删除',
    danger: true,
    icon: (
      <Icon
        icon="ant-design:delete-outlined"
        width={14}
        height={14}
      />
    )
  }
]

function buildLayout(tile: Tile): MenuItem {
  return {
    key: 'layout',
    label: '布局',
    icon: (
      <Icon
        icon="ant-design:appstore-outlined"
        width={14}
        height={14}
      />
    ),
    // tile 的布局变了就换 key：LayoutPicker 借此重置草稿（比在 effect 里 setState 干净）
    content: (
      <LayoutPicker
        key={`${tile.size}-${tile.shape}-${tile.direction}`}
        tile={tile}
      />
    )
  }
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
          void itc.overlay.toUpdate({ visible: true })
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
          void itc.overlay.toUpdate({ visible: false })
        }
      }
    ]
  }
}

function buildItems(tile: Tile): MenuItem[] {
  return [buildLayout(tile), buildFloat(tile), { type: 'divider' }, ...ACTIONS]
}

export { buildItems }
