/**
 * chrome://i-thinking WebUI 下的最小 ITC 形状。
 * 刻意不从 studio/plugins 引入，避免拉入 electron。
 */

interface StoreReadP {
  key: string
}

interface StoreWriteP {
  key: string
  value: unknown
}

interface StoreRemoveP {
  key: string
}

interface ShellOpenP {
  url: string
}

interface OverlayReadR {
  visible: boolean
}

interface OverlayUpdateP {
  visible: boolean
}

interface SidecarStatusR {
  isReady: boolean
  version: string
  actions: string[]
  hasCorex: boolean
  hasPandoc: boolean
}

interface UpdaterStatusR {
  enabled: boolean
  checking: boolean
  downloading: boolean
  downloaded: boolean
  progress: number | null
  version: string | null
  error: string | null
}

interface UpdaterCheckR {
  available: boolean
  version: string | null
  releaseNotes: string | null
  reason?: string
}

interface UpdaterEventP {
  type: string
  version?: string
  releaseNotes?: string | null
  percent?: number
  message?: string
}

interface BrowserItc {
  store: {
    toRead(input: StoreReadP): Promise<unknown>
    toWrite(input: StoreWriteP): Promise<void>
    has(input: StoreReadP): Promise<boolean>
    toRemove(input: StoreRemoveP): Promise<void>
    clear(): Promise<void>
    keys(): Promise<string[]>
  }
  dialog: {
    open(input?: unknown): Promise<string[] | null>
    save(input?: unknown): Promise<string | null>
  }
  user: {
    toRead(): Promise<unknown[]>
    toWrite(input: unknown): Promise<unknown>
    toUpdate(input: unknown): Promise<unknown>
    toRemove(input: unknown): Promise<void>
  }
  sidecar: {
    toRead(): Promise<SidecarStatusR>
  }
  doc: {
    convert(input: unknown): Promise<unknown>
  }
  screenshot: {
    capture(): Promise<unknown>
  }
  updater: {
    toRead(): Promise<UpdaterStatusR>
    check(): Promise<UpdaterCheckR>
    download(): Promise<void>
    install(): Promise<void>
    onEvent(callback: (payload: UpdaterEventP) => void): () => void
  }
  devtools: {
    toUpdate(input: unknown): Promise<void>
  }
  overlay: {
    toRead(): Promise<OverlayReadR>
    toUpdate(input: OverlayUpdateP): Promise<void>
  }
  shell: {
    open(input: ShellOpenP): Promise<void>
  }
  app: {
    onMessage(callback: (payload: unknown) => void): () => void
  }
}

export type {
  BrowserItc,
  OverlayReadR,
  OverlayUpdateP,
  ShellOpenP,
  SidecarStatusR,
  StoreReadP,
  StoreRemoveP,
  StoreWriteP,
  UpdaterCheckR,
  UpdaterEventP,
  UpdaterStatusR
}
