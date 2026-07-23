/** IPC channel 单源；格式 namespace:action，按域分层 */
export const CHANNELS = {
  STORE: {
    GET: 'store:get',
    SET: 'store:set',
    HAS: 'store:has',
    DELETE: 'store:delete',
    CLEAR: 'store:clear',
    KEYS: 'store:keys'
  },
  DIALOG: {
    OPEN: 'dialog:open',
    SAVE: 'dialog:save'
  },
  USER: {
    LIST: 'user:list',
    CREATE: 'user:create',
    UPDATE: 'user:update',
    REMOVE: 'user:remove'
  },
  SIDECAR: {
    FIND_PATH: 'sidecar:find-path',
    EXEC: 'sidecar:exec'
  },
  SCREENSHOT: {
    CAPTURE: 'screenshot:capture',
    RECORD_START: 'screenshot:record-start',
    RECORD_STOP: 'screenshot:record-stop'
  },
  DEVTOOLS: {
    UPDATE_VISIBLE: 'devtools:update-visible'
  },
  APP: {
    MESSAGE: 'app:message'
  }
} as const

type NestedValue<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]: NestedValue<T[K]> }[keyof T]
    : never

export type Channel = NestedValue<typeof CHANNELS>
