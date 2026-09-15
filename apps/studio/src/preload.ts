import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from './host/contract/channels'
import type { ITC } from './host/contract/itc'
import type { IpcResult } from './host/contract/result'

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

/**
 * 离线通路的端口交付：主进程收到 connect 后把端口推过来，而 renderer 侧的消费者
 * 可能在 connect 之后才注册回调 —— 这里先排队，避免丢端口（竞态）。
 */
const portCallbacks = new Set<(port: MessagePort) => void>()
const pendingPorts: MessagePort[] = []

ipcRenderer.on(CHANNELS.ASSISTANT.PORT, function (event) {
  const port = event.ports[0]
  if (!port) return
  if (portCallbacks.size === 0) {
    pendingPorts.push(port)
    return
  }
  portCallbacks.forEach(function (callback) {
    callback(port)
  })
})

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
    toRead() {
      return invoke(CHANNELS.SIDECAR.READ)
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
    toRead() {
      return invoke(CHANNELS.UPDATER.READ)
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
      function handler(_event: unknown, payload: unknown) {
        callback(payload as Parameters<typeof callback>[0])
      }
      ipcRenderer.on(CHANNELS.UPDATER.EVENT, handler)
      return function () {
        ipcRenderer.removeListener(CHANNELS.UPDATER.EVENT, handler)
      }
    }
  },
  devtools: {
    toUpdate(input) {
      return invoke(CHANNELS.DEVTOOLS.UPDATE, input)
    }
  },
  overlay: {
    toRead() {
      return invoke(CHANNELS.OVERLAY.READ)
    },
    toUpdate(input) {
      return invoke(CHANNELS.OVERLAY.UPDATE, input)
    }
  },
  chat: {
    provider: {
      toRead() {
        return invoke(CHANNELS.CHAT.PROVIDER.READ)
      },
      toWrite(input) {
        return invoke(CHANNELS.CHAT.PROVIDER.WRITE, input)
      },
      toUpdate(input) {
        return invoke(CHANNELS.CHAT.PROVIDER.UPDATE, input)
      },
      toRemove(input) {
        return invoke(CHANNELS.CHAT.PROVIDER.REMOVE, input)
      }
    },
    session: {
      toRead() {
        return invoke(CHANNELS.CHAT.SESSION.READ)
      },
      toWrite(input) {
        return invoke(CHANNELS.CHAT.SESSION.WRITE, input)
      },
      toUpdate(input) {
        return invoke(CHANNELS.CHAT.SESSION.UPDATE, input)
      },
      toRemove(input) {
        return invoke(CHANNELS.CHAT.SESSION.REMOVE, input)
      }
    },
    message: {
      toRead(input) {
        return invoke(CHANNELS.CHAT.MESSAGE.READ, input)
      },
      toAppend(input) {
        return invoke(CHANNELS.CHAT.MESSAGE.APPEND, input)
      },
      toUpdate(input) {
        return invoke(CHANNELS.CHAT.MESSAGE.UPDATE, input)
      },
      toRemove(input) {
        return invoke(CHANNELS.CHAT.MESSAGE.REMOVE, input)
      }
    }
  },
  assistant: {
    connect() {
      return invoke(CHANNELS.ASSISTANT.CONNECT)
    },
    onPort(callback) {
      portCallbacks.add(callback)
      // 把先于注册到达的端口补交给它
      while (pendingPorts.length > 0) {
        const port = pendingPorts.shift()
        if (port) callback(port)
      }
      return function () {
        portCallbacks.delete(callback)
      }
    },
    key: {
      toWrite(input) {
        return invoke(CHANNELS.ASSISTANT.KEY.WRITE, input)
      },
      has(input) {
        return invoke(CHANNELS.ASSISTANT.KEY.HAS, input)
      },
      toRemove(input) {
        return invoke(CHANNELS.ASSISTANT.KEY.REMOVE, input)
      }
    }
  }
}

contextBridge.exposeInMainWorld('itc', itc)
