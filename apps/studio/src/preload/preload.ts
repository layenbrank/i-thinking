import { CHANNELS } from '@shared/ipc/channels'
import type { IpcResult } from '@shared/ipc/result'
import type { ITC } from '@shared/ipc/studio'
import { contextBridge, ipcRenderer } from 'electron'

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, payload)) as IpcResult<T>
  if (!result || typeof result !== 'object' || !('ok' in result)) {
    throw new Error(`Invalid IPC response for ${channel}`)
  }
  if (!result.ok) {
    throw new Error(`[${result.code}] ${result.message}`)
  }
  return result.data
}

const itc: ITC = {
  store: {
    toRead(input) {
      return invoke(CHANNELS.STORE.READ, input)
    },
    toWrite(input) {
      return invoke(CHANNELS.STORE.WRITE, input)
    },
    has(input) {
      return invoke(CHANNELS.STORE.HAS, input)
    },
    toRemove(input) {
      return invoke(CHANNELS.STORE.REMOVE, input)
    },
    clear() {
      return invoke(CHANNELS.STORE.CLEAR)
    },
    keys() {
      return invoke(CHANNELS.STORE.KEYS)
    }
  },
  dialog: {
    open(input) {
      return invoke(CHANNELS.DIALOG.OPEN, input)
    },
    save(input) {
      return invoke(CHANNELS.DIALOG.SAVE, input)
    }
  },
  user: {
    toRead() {
      return invoke(CHANNELS.USER.READ)
    },
    toWrite(input) {
      return invoke(CHANNELS.USER.WRITE, input)
    },
    toUpdate(input) {
      return invoke(CHANNELS.USER.UPDATE, input)
    },
    toRemove(input) {
      return invoke(CHANNELS.USER.REMOVE, input)
    }
  },
  sidecar: {
    findStatus() {
      return invoke(CHANNELS.SIDECAR.FIND_STATUS)
    }
  },
  doc: {
    convert(input) {
      return invoke(CHANNELS.DOC.CONVERT, input)
    }
  },
  screenshot: {
    capture() {
      return invoke(CHANNELS.SCREENSHOT.CAPTURE)
    }
  },
  updater: {
    findStatus() {
      return invoke(CHANNELS.UPDATER.FIND_STATUS)
    },
    check() {
      return invoke(CHANNELS.UPDATER.CHECK)
    },
    download() {
      return invoke(CHANNELS.UPDATER.DOWNLOAD)
    },
    install() {
      return invoke(CHANNELS.UPDATER.INSTALL)
    },
    onEvent(callback) {
      function handler(_event: unknown, payload: Parameters<typeof callback>[0]) {
        callback(payload)
      }
      ipcRenderer.on(CHANNELS.UPDATER.EVENT, handler)
      return function () {
        ipcRenderer.removeListener(CHANNELS.UPDATER.EVENT, handler)
      }
    }
  },
  devtools: {
    updateVisible(input) {
      return invoke(CHANNELS.DEVTOOLS.UPDATE_VISIBLE, input)
    }
  },
  app: {
    onMessage(callback) {
      function handler(_event: unknown, payload: unknown) {
        callback(payload)
      }
      ipcRenderer.on(CHANNELS.APP.MESSAGE, handler)
      return function () {
        ipcRenderer.removeListener(CHANNELS.APP.MESSAGE, handler)
      }
    }
  }
}

contextBridge.exposeInMainWorld('itc', itc)
