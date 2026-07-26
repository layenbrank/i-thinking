import type { Appearance } from '@/themes'
import { parseAppearance, stringifyAppearance } from '@/themes'

const THEME_FILE_FILTER = [{ name: 'JSON', extensions: ['json'] }]

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function exportAppearanceFile(appearance: Appearance): Promise<void> {
  const content = stringifyAppearance(appearance)
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({
      defaultPath: 'appearance.json',
      filters: THEME_FILE_FILTER
    })
    if (!path) return
    await writeTextFile(path, content)
    return
  }
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'appearance.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importAppearanceFile(): Promise<Appearance | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await open({
      multiple: false,
      filters: THEME_FILE_FILTER
    })
    if (!path || Array.isArray(path)) return null
    const raw = await readTextFile(path)
    return parseAppearance(raw)
  }
  return new Promise(function (resolve) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.addEventListener(
      'change',
      function () {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }
        const reader = new FileReader()
        reader.addEventListener(
          'load',
          function () {
            try {
              resolve(parseAppearance(String(reader.result)))
            } catch {
              resolve(null)
            }
          },
          { once: true }
        )
        reader.readAsText(file, 'utf-8')
      },
      { once: true }
    )
    input.click()
  })
}
