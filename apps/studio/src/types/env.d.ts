interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string

  readonly VITE_ENGINE: string
  readonly VITE_THINKING: string
  readonly VITE_INTELLIGENCE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type EnvURL = 'thinking' | 'engine' | 'intelligence'

var MediaStreamTrackProcessor: {
  prototype: MediaStreamTrackProcessor
  new (options: MediaStreamTrack): TransformStream
}

declare type Recordable<T = any> = Record<string, T>

declare module '*.contribution' {
  const src: string
  export default src
}

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string

    NODE_ENV: 'development' | 'test' | 'production'
    readonly VITE_DEV_SERVER_URL: string
  }

  interface Process {
    electronApp: import('node:child_process').ChildProcess
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer & {
    store: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
      has: (key: string) => Promise<boolean>
      delete: (key: string) => Promise<void>
      clear: () => Promise<void>
      keys: () => Promise<string[]>
    }
    dialog: {
      open: (options?: {
        multiple?: boolean
        filters?: { name: string; extensions: string[] }[]
      }) => Promise<string[] | null>
      save: (options?: {
        defaultPath?: string
        filters?: { name: string; extensions: string[] }[]
      }) => Promise<string | null>
    }
    app: {
      onMessage: (callback: (payload: unknown) => void) => () => void
    }
    /** Database：传 SQL 动态查询（Prisma + better-sqlite3），对齐 Tauri plugin-sql */
    database: {
      query: (
        sql: string,
        params?: unknown[]
      ) => Promise<Record<string, unknown>[]>
      execute: (sql: string, params?: unknown[]) => Promise<void>
      close: () => Promise<void>
    }
  }
}
