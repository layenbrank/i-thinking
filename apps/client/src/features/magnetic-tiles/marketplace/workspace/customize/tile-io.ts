import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

import { timeSphere } from '@i-thinking/utils'
import type { MagneticTileWrite } from '@/stores/mirror.ts'

const FILE_FILTER = [{ name: 'JSON', extensions: ['json'] }]

function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function formatFilename() {
  const stamp = timeSphere.now().format('YYYY-MM-DD-HH-mm-ss')
  return `magnetic-tiles-${stamp}.json`
}

/** 导出磁贴 JSON；取消另存为返回 false，成功返回 true */
async function exportTiles(tiles: MagneticTile[]): Promise<boolean> {
  const content = JSON.stringify(tiles, null, 2)
  const filename = formatFilename()

  if (isTauri()) {
    const path = await save({
      defaultPath: filename,
      filters: FILE_FILTER
    })
    if (!path) return false
    await writeTextFile(path, content)
    return true
  }

  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}

function parseWrite(item: MagneticTile, mirrorID: string, index: number): MagneticTileWrite {
  return {
    index: item.index ?? index,
    title: item.title,
    url: item.url,
    round: item.round,
    mark: item.mark,
    component: item.component,
    description: item.description,
    background: item.background,
    backdrop: item.backdrop,
    mirrorID,
    textColor: item.textColor,
    collectionID: null,
    size: item.size,
    shape: item.shape,
    direction: item.direction
  }
}

export { exportTiles, parseWrite }
