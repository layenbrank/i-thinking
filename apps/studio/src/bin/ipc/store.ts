import type { IpcMain } from 'electron'
import Store from 'electron-store'

export function registerStoreIpc(ipcMain: IpcMain): void {
  const store = new Store()

  ipcMain.handle('store:get', function (_event, key: string) {
    return store.get(key) ?? null
  })
  ipcMain.handle('store:set', function (_event, key: string, value: unknown) {
    store.set(key, value)
    return undefined
  })
  ipcMain.handle('store:has', function (_event, key: string) {
    return store.has(key)
  })
  ipcMain.handle('store:delete', function (_event, key: string) {
    store.delete(key)
    return undefined
  })
  ipcMain.handle('store:clear', function () {
    store.clear()
    return undefined
  })
  ipcMain.handle('store:keys', function () {
    return Object.keys(store.store)
  })
}
