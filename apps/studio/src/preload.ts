import type { IpcRendererEvent } from 'electron'
import { contextBridge, ipcRenderer } from 'electron'

import { attachAssistantPort } from './preload.port'
import type { Api, IpcFn, Subscribe, Unsubscribe } from './shared/ipc/api'
import type { InvokeChannel, PushChannel } from './shared/ipc/channels'
import { CHANNELS } from './shared/ipc/channels'
import { IpcClientError, type IpcEnvelope, type IpcErrorPayload } from './shared/ipc/error'
import type { Out, PushOut } from './shared/ipc/specs'

function isEnvelope(value: unknown): value is IpcEnvelope<unknown> {
  return typeof value === 'object' && value !== null && 'ok' in value
}

/**
 * 解信封并转成异常语义：调用点只需 try/catch，不必检查 `ok` 标志。
 *
 * 失败一律抛 `IpcClientError`。注意 **code 已编进 message** ——
 * `contextBridge` 会丢弃 Error 的自定义属性，渲染侧只能靠
 * `decodeIpcMessage` 从 message 前缀还原。
 */
async function invoke<K extends InvokeChannel>(channel: K, payload?: unknown): Promise<Out<K>> {
  const response: unknown = await ipcRenderer.invoke(channel, payload)
  if (!isEnvelope(response)) {
    throw new IpcClientError('IPC_UNKNOWN', `Invalid IPC response for ${channel}`)
  }
  if (!response.ok) {
    const failure: IpcErrorPayload = response.error
    throw new IpcClientError(failure.code, failure.message, {
      details: failure.details,
      stack: failure.stack
    })
  }
  return response.data as Out<K>
}

/**
 * 把一个 invoke 频道包成方法。**频道字符串只出现在这里与契约里** ——
 * 渲染进程拿到的是一组具名方法，无法自己拼频道名。
 */
function toInvoke<K extends InvokeChannel>(channel: K): IpcFn<K> {
  return function (input?: unknown) {
    return invoke(channel, input)
  } as IpcFn<K>
}

/**
 * 把一个推送频道包成订阅。**事件对象一律不外传**（`IpcRendererEvent`
 * 会泄漏 senderFrame），只交 payload。
 */
function toSubscribe<K extends PushChannel>(
  channel: K,
  toPayload: (raw: unknown) => PushOut<K>
): Subscribe<PushOut<K>> {
  return function (callback): Unsubscribe {
    function handler(_event: IpcRendererEvent, raw: unknown): void {
      callback(toPayload(raw))
    }
    ipcRenderer.on(channel, handler)
    return function () {
      ipcRenderer.removeListener(channel, handler)
    }
  }
}

/** 主进程是发送方，推送载荷无需校验，只为渲染侧提供类型 */
function toUpdaterEvent(raw: unknown): PushOut<typeof CHANNELS.UPDATER.EVENT> {
  return raw as PushOut<typeof CHANNELS.UPDATER.EVENT>
}

const api = {
  store: {
    toRead: toInvoke(CHANNELS.STORE.READ),
    toWrite: toInvoke(CHANNELS.STORE.WRITE),
    has: toInvoke(CHANNELS.STORE.HAS),
    toRemove: toInvoke(CHANNELS.STORE.REMOVE),
    clear: toInvoke(CHANNELS.STORE.CLEAR),
    keys: toInvoke(CHANNELS.STORE.KEYS)
  },
  dialog: {
    open: toInvoke(CHANNELS.DIALOG.OPEN),
    save: toInvoke(CHANNELS.DIALOG.SAVE)
  },
  user: {
    toRead: toInvoke(CHANNELS.USER.READ),
    toWrite: toInvoke(CHANNELS.USER.WRITE),
    toUpdate: toInvoke(CHANNELS.USER.UPDATE),
    toRemove: toInvoke(CHANNELS.USER.REMOVE)
  },
  sidecar: {
    toRead: toInvoke(CHANNELS.SIDECAR.READ)
  },
  doc: {
    convert: toInvoke(CHANNELS.DOC.CONVERT)
  },
  screenshot: {
    capture: toInvoke(CHANNELS.SCREENSHOT.CAPTURE)
  },
  devtools: {
    toUpdate: toInvoke(CHANNELS.DEVTOOLS.UPDATE)
  },
  updater: {
    toRead: toInvoke(CHANNELS.UPDATER.READ),
    check: toInvoke(CHANNELS.UPDATER.CHECK),
    download: toInvoke(CHANNELS.UPDATER.DOWNLOAD),
    install: toInvoke(CHANNELS.UPDATER.INSTALL),
    onEvent: toSubscribe(CHANNELS.UPDATER.EVENT, toUpdaterEvent)
  },
  overlay: {
    toRead: toInvoke(CHANNELS.OVERLAY.READ),
    toUpdate: toInvoke(CHANNELS.OVERLAY.UPDATE)
  },
  window: {
    agent: {
      toOpen: toInvoke(CHANNELS.WINDOW.AGENT.OPEN)
    }
  },
  workspace: {
    toRead: toInvoke(CHANNELS.WORKSPACE.READ),
    toWrite: toInvoke(CHANNELS.WORKSPACE.WRITE),
    toUpdate: toInvoke(CHANNELS.WORKSPACE.UPDATE),
    toRemove: toInvoke(CHANNELS.WORKSPACE.REMOVE),
    toArchive: toInvoke(CHANNELS.WORKSPACE.ARCHIVE),
    folders: {
      toWrite: toInvoke(CHANNELS.WORKSPACE.FOLDERS.WRITE),
      toUpdate: toInvoke(CHANNELS.WORKSPACE.FOLDERS.UPDATE),
      toRemove: toInvoke(CHANNELS.WORKSPACE.FOLDERS.REMOVE)
    },
    listDir: toInvoke(CHANNELS.WORKSPACE.LIST_DIR),
    search: toInvoke(CHANNELS.WORKSPACE.SEARCH),
    readFile: toInvoke(CHANNELS.WORKSPACE.READ_FILE),
    listSkills: toInvoke(CHANNELS.WORKSPACE.LIST_SKILLS),
    git: {
      probe: toInvoke(CHANNELS.WORKSPACE.GIT.PROBE),
      branches: toInvoke(CHANNELS.WORKSPACE.GIT.BRANCHES),
      checkout: toInvoke(CHANNELS.WORKSPACE.GIT.CHECKOUT)
    },
    changes: {
      toRead: toInvoke(CHANNELS.WORKSPACE.CHANGES.READ),
      toUndo: toInvoke(CHANNELS.WORKSPACE.CHANGES.UNDO)
    }
  },
  chat: {
    provider: {
      toRead: toInvoke(CHANNELS.CHAT.PROVIDER.READ),
      toWrite: toInvoke(CHANNELS.CHAT.PROVIDER.WRITE),
      toUpdate: toInvoke(CHANNELS.CHAT.PROVIDER.UPDATE),
      toRemove: toInvoke(CHANNELS.CHAT.PROVIDER.REMOVE)
    },
    session: {
      toRead: toInvoke(CHANNELS.CHAT.SESSION.READ),
      toWrite: toInvoke(CHANNELS.CHAT.SESSION.WRITE),
      toUpdate: toInvoke(CHANNELS.CHAT.SESSION.UPDATE),
      toRemove: toInvoke(CHANNELS.CHAT.SESSION.REMOVE)
    },
    message: {
      toRead: toInvoke(CHANNELS.CHAT.MESSAGE.READ),
      toAppend: toInvoke(CHANNELS.CHAT.MESSAGE.APPEND),
      toUpdate: toInvoke(CHANNELS.CHAT.MESSAGE.UPDATE),
      toRemove: toInvoke(CHANNELS.CHAT.MESSAGE.REMOVE)
    }
  },
  assistant: {
    connect: toInvoke(CHANNELS.ASSISTANT.CONNECT),
    key: {
      toWrite: toInvoke(CHANNELS.ASSISTANT.KEY.WRITE),
      has: toInvoke(CHANNELS.ASSISTANT.KEY.HAS),
      toRemove: toInvoke(CHANNELS.ASSISTANT.KEY.REMOVE)
    }
  }
} satisfies Api

// 离线通路的端口转发必须显式挂上：不能只靠 `import './preload.port'` 的副作用（怕被 tree-shake）
attachAssistantPort()

contextBridge.exposeInMainWorld('itc', api)
