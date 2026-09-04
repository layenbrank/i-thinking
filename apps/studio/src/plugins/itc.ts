import type {
  ReadR as UserReadR,
  RemoveP as UserRemoveP,
  UpdateP as UserUpdateP,
  WriteP as UserWriteP
} from './database'
import type { UpdateP as DevtoolsUpdateP } from './devtools'
import type { OpenP as DialogOpenP, SaveP as DialogSaveP } from './dialog'
import type { ConvertP as DocConvertP, ConvertR as DocConvertR } from './doc'
import type { CaptureR as ScreenshotCaptureR } from './screenshot'
import type { FindStatusR as SidecarFindStatusR } from './sidecar'
import type { ReadR, UpdateP } from './overlay'
import type { OpenP as ShellOpenP } from './shell'
import type {
  HasP as StoreHasP,
  HasR as StoreHasR,
  ReadP as StoreReadP,
  ReadR as StoreReadR,
  RemoveP as StoreRemoveP,
  WriteP as StoreWriteP
} from './store'
import type { CheckR as UpdaterCheckR, FindStatusR as UpdaterFindStatusR } from './updater'

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
    toRead: () => Promise<SidecarFindStatusR>
  }
  doc: {
    convert: (input: DocConvertP) => Promise<DocConvertR>
  }
  screenshot: {
    capture: () => Promise<ScreenshotCaptureR>
  }
  updater: {
    toRead: () => Promise<UpdaterFindStatusR>
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
    toUpdate: (input: DevtoolsUpdateP) => Promise<void>
  }
  overlay: {
    toRead: () => Promise<ReadR>
    toUpdate: (input: UpdateP) => Promise<void>
  }
  shell: {
    open: (input: ShellOpenP) => Promise<void>
  }
  app: {
    onMessage: (callback: (payload: unknown) => void) => () => void
  }
}
