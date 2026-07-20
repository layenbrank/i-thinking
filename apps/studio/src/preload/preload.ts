import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/ipc/channels'
import type { IpcResult } from '../shared/ipc/result'
import type { Studio } from '../shared/ipc/contracts'

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

const studio: Studio = {
  store: {
    get(input) {
      return invoke(CHANNELS.STORE_GET, input)
    },
    set(input) {
      return invoke(CHANNELS.STORE_SET, input)
    },
    has(input) {
      return invoke(CHANNELS.STORE_HAS, input)
    },
    delete(input) {
      return invoke(CHANNELS.STORE_DELETE, input)
    },
    clear() {
      return invoke(CHANNELS.STORE_CLEAR)
    },
    keys() {
      return invoke(CHANNELS.STORE_KEYS)
    }
  },
  dialog: {
    open(input) {
      return invoke(CHANNELS.DIALOG_OPEN, input)
    },
    save(input) {
      return invoke(CHANNELS.DIALOG_SAVE, input)
    }
  },
  user: {
    list() {
      return invoke(CHANNELS.USER_LIST)
    },
    create(input) {
      return invoke(CHANNELS.USER_CREATE, input)
    },
    update(input) {
      return invoke(CHANNELS.USER_UPDATE, input)
    },
    remove(input) {
      return invoke(CHANNELS.USER_REMOVE, input)
    }
  },
  sidecar: {
    findPath(input) {
      return invoke(CHANNELS.SIDECAR_FIND_PATH, input)
    },
    exec(input) {
      return invoke(CHANNELS.SIDECAR_EXEC, input)
    }
  },
  devtools: {
    updateVisible(input) {
      return invoke(CHANNELS.DEVTOOLS_UPDATE_VISIBLE, input)
    }
  },
  app: {
    onMessage(callback) {
      function handler(_event: unknown, payload: unknown) {
        callback(payload)
      }
      ipcRenderer.on(CHANNELS.APP_MESSAGE, handler)
      return function () {
        ipcRenderer.removeListener(CHANNELS.APP_MESSAGE, handler)
      }
    }
  }
}

contextBridge.exposeInMainWorld('studio', studio)
