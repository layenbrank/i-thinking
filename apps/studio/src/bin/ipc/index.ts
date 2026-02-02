import { ipcMain, type BrowserWindow } from 'electron'
import { registerDatabaseIpc } from './database'
import { registerDialogIpc } from './dialog'
import { registerStoreIpc } from './store'

export interface RegisterIpcOptions {
  getWindow: () => BrowserWindow | null
}

export function registerAllIpc(options: RegisterIpcOptions): void {
  registerStoreIpc(ipcMain)
  registerDialogIpc(ipcMain, options.getWindow)
  registerDatabaseIpc(ipcMain)
}
