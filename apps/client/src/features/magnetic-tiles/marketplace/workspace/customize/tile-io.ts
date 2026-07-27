import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

import { timeSphere } from '@i-thinking/utils'

const TILE_FILE_FILTER = [{ name: 'JSON', extensions: ['json'] }]

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function buildFilename(): string {
  const formatted = timeSphere.now().format('YYYY-MM-DD-HH-mm-ss')
  return `magnetic-tiles-${formatted}.json`
}

/** 导出磁贴 JSON；用户取消另存为时返回 false，成功写入返回 true */
async function exportMagneticTilesFile(tiles: MagneticTile[]): Promise<boolean> {
  const content = JSON.stringify(tiles, null, 2)
  const filename = buildFilename()

  if (isTauri()) {
    const path = await save({
      defaultPath: filename,
      filters: TILE_FILE_FILTER
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

export { exportMagneticTilesFile }
