import { toast } from 'sonner'

import { findTileRoute, findTileWindowOptions } from '@/constants/magnetic-tile/window'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'
import { openWindow } from '@/features/window/open'

type Tile = Pick<MagneticTile, 'component' | 'url' | 'id'>

/**
 * 窗口 label：`<component>:<磁贴 id>`。
 *
 * 一个组件可以有多个磁贴记录（各自 url / 标题），按记录建窗才能一窗对一记录 ——
 * 这正是当年「每个磁贴一个 Dialog」的语义，只是壳换成了真窗口。
 */
function findTileWindowLabel(tile: Tile) {
  return `${tile.component}:${tile.id}`
}

/** 记录上的 url 只能经 URL 传递（窗口是独立 webview，拿不到磁贴记录） */
function findTileWindowUrl(tile: Tile) {
  const route = findTileRoute(tile.component)
  if (!tile.url) return route
  return `${route}?url=${encodeURIComponent(tile.url)}`
}

/**
 * 激活磁贴：一律走独立窗口（`views/<component>`），不再在主窗内弹 Dialog。
 * 同一个磁贴记录重复激活只聚焦，不重复建窗。
 */
async function activateTile(tile: Tile): Promise<void> {
  try {
    await openWindow(
      findTileWindowLabel(tile),
      findTileWindowUrl(tile),
      findComponentLabel(tile.component),
      findTileWindowOptions(tile.component)
    )
  } catch (error) {
    console.error('[magnetic-tile] 打开窗口失败', error)
    toast.error(`${findComponentLabel(tile.component)}窗口打开失败`)
  }
}

export { activateTile, findTileWindowLabel, findTileWindowUrl }
export type { Tile }
