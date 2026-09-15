/** IPC channel 单源；格式 namespace:action，按域分层 */
export const CHANNELS = {
  STORE: {
    READ: 'store:toRead',
    WRITE: 'store:toWrite',
    HAS: 'store:has',
    REMOVE: 'store:toRemove',
    CLEAR: 'store:clear',
    KEYS: 'store:keys'
  },
  DIALOG: {
    OPEN: 'dialog:open',
    SAVE: 'dialog:save'
  },
  USER: {
    READ: 'user:toRead',
    WRITE: 'user:toWrite',
    UPDATE: 'user:toUpdate',
    REMOVE: 'user:toRemove'
  },
  SIDECAR: {
    READ: 'sidecar:toRead'
  },
  DOC: {
    CONVERT: 'doc:convert'
  },
  SCREENSHOT: {
    CAPTURE: 'screenshot:capture'
  },
  DEVTOOLS: {
    UPDATE: 'devtools:toUpdate'
  },
  UPDATER: {
    READ: 'updater:toRead',
    CHECK: 'updater:check',
    DOWNLOAD: 'updater:download',
    INSTALL: 'updater:install',
    EVENT: 'updater:event'
  },
  OVERLAY: {
    READ: 'overlay:toRead',
    UPDATE: 'overlay:toUpdate'
  },
  CHAT: {
    PROVIDER: {
      READ: 'chat:provider.toRead',
      WRITE: 'chat:provider.toWrite',
      UPDATE: 'chat:provider.toUpdate',
      REMOVE: 'chat:provider.toRemove'
    },
    SESSION: {
      READ: 'chat:session.toRead',
      WRITE: 'chat:session.toWrite',
      UPDATE: 'chat:session.toUpdate',
      REMOVE: 'chat:session.toRemove'
    },
    MESSAGE: {
      READ: 'chat:message.toRead',
      APPEND: 'chat:message.toAppend',
      UPDATE: 'chat:message.toUpdate',
      REMOVE: 'chat:message.toRemove'
    }
  },
  ASSISTANT: {
    /** 建立离线通路（MessagePort，见 plugins/assistant.ts） */
    CONNECT: 'assistant:connect',
    /** 主进程 → 渲染进程推送端口；不是 invoke 通道 */
    PORT: 'assistant:port',
    KEY: {
      WRITE: 'assistant:key.toWrite',
      HAS: 'assistant:key.has',
      REMOVE: 'assistant:key.toRemove'
    }
  }
} as const

type NestedValue<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]: NestedValue<T[K]> }[keyof T]
    : never

export type Channel = NestedValue<typeof CHANNELS>
