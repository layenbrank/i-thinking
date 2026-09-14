import type {
  MessageAppendP,
  MessageReadP,
  MessageReadR,
  MessageUpdateP,
  ProviderReadR,
  ProviderUpdateP,
  ProviderWriteP,
  RemoveP as ChatRemoveP,
  SessionReadR,
  SessionUpdateP,
  SessionWriteP
} from './chat'
import type { KeyRefP, KeyWriteP } from './assistant-key'
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
  chat: {
    provider: {
      toRead: () => Promise<ProviderReadR[]>
      toWrite: (input: ProviderWriteP) => Promise<ProviderReadR>
      toUpdate: (input: ProviderUpdateP) => Promise<ProviderReadR>
      toRemove: (input: ChatRemoveP) => Promise<void>
    }
    session: {
      toRead: () => Promise<SessionReadR[]>
      toWrite: (input: SessionWriteP) => Promise<SessionReadR>
      toUpdate: (input: SessionUpdateP) => Promise<SessionReadR>
      toRemove: (input: ChatRemoveP) => Promise<void>
    }
    message: {
      toRead: (input: MessageReadP) => Promise<MessageReadR[]>
      toAppend: (input: MessageAppendP) => Promise<MessageReadR>
      toUpdate: (input: MessageUpdateP) => Promise<MessageReadR>
      toRemove: (input: ChatRemoveP) => Promise<void>
    }
  }
  assistant: {
    /** 建立离线通路；端口通过 `onPort` 交付（应为先注册、后 connect） */
    connect: () => Promise<void>
    onPort: (callback: (port: MessagePort) => void) => () => void
    key: {
      toWrite: (input: KeyWriteP) => Promise<void>
      has: (input: KeyRefP) => Promise<boolean>
      toRemove: (input: KeyRefP) => Promise<void>
    }
  }
}
