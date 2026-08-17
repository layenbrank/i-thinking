import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

import type { Appearance } from '@/themes'
import { parseAppearance, stringifyAppearance } from '@/themes'

const THEME_FILE_FILTER = [{ name: 'JSON', extensions: ['json'] }]

export async function exportAppearanceFile(appearance: Appearance): Promise<void> {
  const content = stringifyAppearance(appearance)
  const path = await save({
    defaultPath: 'appearance.json',
    filters: THEME_FILE_FILTER
  })
  if (!path) return
  await writeTextFile(path, content)
}

export async function importAppearanceFile(): Promise<Appearance | null> {
  const path = await open({
    multiple: false,
    filters: THEME_FILE_FILTER
  })
  if (!path || Array.isArray(path)) return null
  const raw = await readTextFile(path)
  return parseAppearance(raw)
}
