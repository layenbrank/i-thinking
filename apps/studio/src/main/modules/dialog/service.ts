import { BrowserWindow, dialog } from 'electron'
import type { OpenInput, SaveInput } from './schemas'

export class Service {
  private readonly findWindow: () => BrowserWindow | null

  constructor(findWindow: () => BrowserWindow | null) {
    this.findWindow = findWindow
  }

  async open(options?: OpenInput): Promise<string[] | null> {
    const w = BrowserWindow.getFocusedWindow() ?? this.findWindow()
    const result = w
      ? await dialog.showOpenDialog(w, {
          properties: options?.multiple
            ? ['openFile', 'multiSelections']
            : ['openFile'],
          filters: options?.filters
        })
      : await dialog.showOpenDialog({
          properties: options?.multiple
            ? ['openFile', 'multiSelections']
            : ['openFile'],
          filters: options?.filters
        })
    return result.canceled ? null : result.filePaths
  }

  async save(options?: SaveInput): Promise<string | null> {
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
