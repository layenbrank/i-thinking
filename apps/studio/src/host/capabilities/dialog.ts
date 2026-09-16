import { BrowserWindow, dialog } from 'electron'

import type { CHANNELS } from '../../shared/ipc/channels'
import { type In, type Out } from '../../shared/ipc/specs'
import { type Filter } from '../../shared/ipc/specs/dialog'

type OpenP = In<typeof CHANNELS.DIALOG.OPEN>
type OpenR = Out<typeof CHANNELS.DIALOG.OPEN>
type SaveP = In<typeof CHANNELS.DIALOG.SAVE>
type SaveR = Out<typeof CHANNELS.DIALOG.SAVE>

class Service {
  private readonly findWindow: () => BrowserWindow | null

  constructor(findWindow: () => BrowserWindow | null) {
    this.findWindow = findWindow
  }

  async open(options?: OpenP): Promise<string[] | null> {
    const w = BrowserWindow.getFocusedWindow() ?? this.findWindow()
    const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> = options?.directory
      ? ['openDirectory']
      : options?.multiple
        ? ['openFile', 'multiSelections']
        : ['openFile']
    const result = w
      ? await dialog.showOpenDialog(w, {
          properties,
          filters: options?.filters
        })
      : await dialog.showOpenDialog({
          properties,
          filters: options?.filters
        })
    return result.canceled ? null : result.filePaths
  }

  async save(options?: SaveP): Promise<string | null> {
    const w = BrowserWindow.getFocusedWindow() ?? this.findWindow()
    const result = w
      ? await dialog.showSaveDialog(w, {
          defaultPath: options?.defaultPath,
          filters: options?.filters
        })
      : await dialog.showSaveDialog({
          defaultPath: options?.defaultPath,
          filters: options?.filters
        })
    return result.canceled ? null : (result.filePath ?? null)
  }
}

export { Service }
export type { Filter, OpenP, OpenR, SaveP, SaveR }
// 临时 re-export：specs 批次收尾时移除
export { OpenSchema, SaveSchema } from '../../shared/ipc/specs/dialog'
