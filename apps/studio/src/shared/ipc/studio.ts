import type { UpdateVisibleP as DevtoolsUpdateVisibleP } from '@shared/ipc/devtools'
import type { OpenP as DialogOpenP, SaveP as DialogSaveP } from '@shared/ipc/dialog'
import type { ConvertP as DocConvertP, ConvertR as DocConvertR } from '@shared/ipc/doc'
import type { CaptureR as ScreenshotCaptureR } from '@shared/ipc/screenshot'
import type { FindStatusR as SidecarFindStatusR } from '@shared/ipc/sidecar'
import type {
  HasP as StoreHasP,
  HasR as StoreHasR,
  ReadP as StoreReadP,
  ReadR as StoreReadR,
  RemoveP as StoreRemoveP,
  WriteP as StoreWriteP
} from '@shared/ipc/store'
import type {
  CheckR as UpdaterCheckR,
  FindStatusR as UpdaterFindStatusR
} from '@shared/ipc/updater'
import type {
  ReadR as UserReadR,
  RemoveP as UserRemoveP,
  UpdateP as UserUpdateP,
  WriteP as UserWriteP
} from '@shared/ipc/user'

/** Renderer SDK 与 Main 对齐的 API 形状（不含实现） */
export interface ITC {
  store: {
    toRead: (input: StoreReadP) => Promise<StoreReadR>
    toWrite: (input: StoreWriteP) => Promise<void>
    has: (input: StoreHasP) => Promise<StoreHasR>
    toRemove: (input: StoreRemoveP) => Promise<void>
    clear: () => Promise<void>
    keys: () => Promise<string[]>
  }
  dialog: {
    open: (input?: DialogOpenP) => Promise<string[] | null>
    save: (input?: DialogSaveP) => Promise<string | null>
  }
  user: {
    toRead: () => Promise<UserReadR[]>
    toWrite: (input: UserWriteP) => Promise<UserReadR>
    toUpdate: (input: UserUpdateP) => Promise<UserReadR>
    toRemove: (input: UserRemoveP) => Promise<void>
  }
  sidecar: {
    findStatus: () => Promise<SidecarFindStatusR>
  }
  doc: {
    convert: (input: DocConvertP) => Promise<DocConvertR>
  }
  screenshot: {
    capture: () => Promise<ScreenshotCaptureR>
  }
  updater: {
    findStatus: () => Promise<UpdaterFindStatusR>
    check: () => Promise<UpdaterCheckR>
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
    updateVisible: (input: DevtoolsUpdateVisibleP) => Promise<void>
  }
  app: {
    onMessage: (callback: (payload: unknown) => void) => () => void
  }
}
