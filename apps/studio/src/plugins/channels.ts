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
  APP: {
    MESSAGE: 'app:message'
  },
  OVERLAY: {
    READ: 'overlay:toRead',
    UPDATE: 'overlay:toUpdate'
  },
  SHELL: {
    OPEN: 'shell:open'
  }
} as const

type NestedValue<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]: NestedValue<T[K]> }[keyof T]
    : never

export type Channel = NestedValue<typeof CHANNELS>
