/* eslint-disable no-var */

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

interface Window {
  MediaStreamTrackProcessor: typeof MediaStreamTrackProcessor
}

var MediaStreamTrackProcessor: {
  prototype: MediaStreamTrackProcessor
  new (options: MediaStreamTrack): TransformStream
}

declare type Recordable<T = any> = Record<string, T>
