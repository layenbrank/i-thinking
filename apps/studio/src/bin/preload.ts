import { contextBridge, ipcRenderer } from 'electron'

const store = {
  get(key: string) {
    return ipcRenderer.invoke('store:get', key)
  },
  set(key: string, value: unknown) {
    return ipcRenderer.invoke('store:set', key, value)
  },
  has(key: string) {
    return ipcRenderer.invoke('store:has', key)
  },
  delete(key: string) {
    return ipcRenderer.invoke('store:delete', key)
  },
  clear() {
    return ipcRenderer.invoke('store:clear')
  },
  keys() {
    return ipcRenderer.invoke('store:keys') as Promise<string[]>
  }
}

const dialog = {
  open(options?: {
    multiple?: boolean
    filters?: { name: string; extensions: string[] }[]
  }) {
    return ipcRenderer.invoke('dialog:open', options)
  },
  save(options?: {
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }) {
    return ipcRenderer.invoke('dialog:save', options)
  }
}

const app = {
  onMessage(callback: (payload: unknown) => void) {
    function handler(_: unknown, payload: unknown) {
      callback(payload)
    }
    ipcRenderer.on('main-process-message', handler)
    return function () {
      ipcRenderer.removeListener('main-process-message', handler)
    }
  }
}

// Database：传 SQL 查数据（Prisma + better-sqlite3，对齐 Tauri plugin-sql）
const database = {
  query(sql: string, params?: unknown[]) {
    return ipcRenderer.invoke('db:query', sql, params ?? []) as Promise<
      Record<string, unknown>[]
    >
  },
  execute(sql: string, params?: unknown[]) {
    return ipcRenderer.invoke('db:execute', sql, params ?? []) as Promise<void>
  },
  close() {
    return ipcRenderer.invoke('db:close') as Promise<void>
  }
}

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, function (event, ...a) {
      listener(event, ...a)
    })
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  store,
  dialog,
  app,
  database
})
