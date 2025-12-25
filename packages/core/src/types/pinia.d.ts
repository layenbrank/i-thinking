import 'pinia'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: {
      key?: string
      storage?: Storage
      paths?: string[]
    }
  }
}
