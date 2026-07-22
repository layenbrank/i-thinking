/** IPC channel 单源；格式 namespace:action */
export const CHANNELS = {
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_HAS: 'store:has',
  STORE_DELETE: 'store:delete',
  STORE_CLEAR: 'store:clear',
  STORE_KEYS: 'store:keys',

  DIALOG_OPEN: 'dialog:open',
  DIALOG_SAVE: 'dialog:save',

  USER_LIST: 'user:list',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_REMOVE: 'user:remove',

  SIDECAR_FIND_PATH: 'sidecar:find-path',
  SIDECAR_EXEC: 'sidecar:exec',

  SCREENSHOT_CAPTURE: 'screenshot:capture',
  SCREENSHOT_RECORD_START: 'screenshot:record-start',
  SCREENSHOT_RECORD_STOP: 'screenshot:record-stop',

  DEVTOOLS_UPDATE_VISIBLE: 'devtools:update-visible',

  APP_MESSAGE: 'app:message'
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]
