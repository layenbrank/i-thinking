import { BrowserWindow, dialog, type IpcMain } from 'electron'

export function registerDialogIpc(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(
    'dialog:open',
    async function (
      _event,
      options?: {
        multiple?: boolean
        filters?: { name: string; extensions: string[] }[]
      }
    ) {
      const w = BrowserWindow.getFocusedWindow() ?? getWindow()
      const result = await dialog.showOpenDialog(w!, {
        properties: options?.multiple
          ? ['openFile', 'multiSelections']
          : ['openFile'],
        filters: options?.filters
      })
      return result.canceled ? null : result.filePaths
    }
  )
  ipcMain.handle(
    'dialog:save',
    async function (
      _event,
      options?: {
        defaultPath?: string
        filters?: { name: string; extensions: string[] }[]
      }
    ) {
      const w = BrowserWindow.getFocusedWindow() ?? getWindow()
      const result = await dialog.showSaveDialog(w!, {
        defaultPath: options?.defaultPath,
        filters: options?.filters
      })
      return result.canceled ? null : result.filePath
    }
  )
}
