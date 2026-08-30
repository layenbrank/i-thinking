import type {
  CreateInput as UserCreateInput,
  RemoveInput as UserRemoveInput,
  UpdateInput as UserUpdateInput,
  UserRecord
} from '@main/modules/database/schemas'
import type {
  OpenInput as DialogOpenInput,
  SaveInput as DialogSaveInput
} from '@main/modules/dialog/schemas'
import type {
  ConvertInput as DocConvertInput,
  ConvertResult as DocConvertResult
} from '@main/modules/doc/schemas'
import type { VisibleInput as DevtoolsVisibleInput } from '@main/modules/devtools/schemas'
import type {
  CaptureResult as ScreenshotCaptureResult,
  RecordStopResult as ScreenshotRecordStopResult
} from '@main/modules/screenshot/schemas'
import type { SidecarStatus } from '@main/modules/sidecar/schemas'
import type {
  GetInput as StoreGetInput,
  SetInput as StoreSetInput
} from '@main/modules/store/schemas'
import type {
  CheckResult as UpdaterCheckResult,
  UpdaterStatus
} from '@main/modules/updater/schemas'

/** Renderer SDK 与 Main 对齐的 API 形状（不含实现） */
export type Studio = {
  store: {
    get: (input: StoreGetInput) => Promise<unknown>
    set: (input: StoreSetInput) => Promise<void>
    has: (input: StoreGetInput) => Promise<boolean>
    delete: (input: StoreGetInput) => Promise<void>
    clear: () => Promise<void>
    keys: () => Promise<string[]>
  }
  dialog: {
    open: (input?: DialogOpenInput) => Promise<string[] | null>
    save: (input?: DialogSaveInput) => Promise<string | null>
  }
  user: {
    list: () => Promise<UserRecord[]>
    create: (input: UserCreateInput) => Promise<UserRecord>
    update: (input: UserUpdateInput) => Promise<UserRecord>
    remove: (input: UserRemoveInput) => Promise<void>
  }
  sidecar: {
    findStatus: () => Promise<SidecarStatus>
  }
  doc: {
    convert: (input: DocConvertInput) => Promise<DocConvertResult>
  }
  screenshot: {
    capture: () => Promise<ScreenshotCaptureResult>
    recordStart: () => Promise<void>
    recordStop: () => Promise<ScreenshotRecordStopResult>
  }
  updater: {
    findStatus: () => Promise<UpdaterStatus>
    check: () => Promise<UpdaterCheckResult>
    download: () => Promise<void>
    install: () => Promise<void>
    onEvent: (
      callback: (payload: {
        type: string
        version?: string
        releaseNotes?: string | null
        percent?: number
        message?: string
      }) => void
    ) => () => void
  }
  devtools: {
    updateVisible: (input: DevtoolsVisibleInput) => Promise<void>
  }
  app: {
    onMessage: (callback: (payload: unknown) => void) => () => void
  }
}
