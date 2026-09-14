interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_THINKING?: string
  readonly VITE_HOSTNAME?: string
  readonly VITE_PORT?: string
  readonly VITE_PROTOCOL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

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

    NODE_ENV: 'development' | 'test' | 'production'
    readonly VITE_DEV_SERVER_URL: string
  }

  interface Process {
    // 这里必须用 import() 内联类型：文件是 ambient 声明，写成顶层 import 会变成模块、丢掉全局
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    electronApp: import('node:child_process').ChildProcess
  }
}
