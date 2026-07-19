import type {
  BinExecInput,
  BinNameInput,
  DevtoolsVisibleInput,
  DialogOpenInput,
  DialogSaveInput,
  StoreGetInput,
  StoreSetInput,
  UserCreateInput,
  UserRemoveInput,
  UserUpdateInput
} from './schemas'

export interface UserRecord {
  id: number
  createdAt: string
  updatedAt: string
  name: string | null
  email: string | null
}

export interface BinExecResult {
  code: number | null
  signal: string | null
  error?: string
}

/** Renderer SDK 与 Main 对齐的 API 形状（不含实现） */
export interface StudioApi {
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
  bin: {
    getPath: (input: BinNameInput) => Promise<string>
    exec: (input: BinExecInput) => Promise<BinExecResult>
  }
  devtools: {
    updateVisible: (input: DevtoolsVisibleInput) => Promise<void>
  }
  app: {
    onMessage: (callback: (payload: unknown) => void) => () => void
  }
}
