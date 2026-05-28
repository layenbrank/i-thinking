import { Effect } from '@tauri-apps/api/window'

import type { WebviewOptions } from '@tauri-apps/api/webview'
import type { WindowOptions } from '@tauri-apps/api/window'

type Configure = Omit<WebviewOptions, 'x' | 'y' | 'width' | 'height'> & WindowOptions

type WindowConfigure = Record<Application.Component, Configure>

const DEfAULT: Configure = {
  backgroundColor: '#00000000',
  center: true,
  closable: true,
  contentProtected: false,
  devtools: true,
  dragDropEnabled: true,
  focus: true,
  fullscreen: false,
  height: 800,
  maximizable: true,
  minHeight: 600,
  minWidth: 800,
  resizable: true,
  decorations: false,
  shadow: false,
  skipTaskbar: false,
  theme: 'light',
  titleBarStyle: 'transparent',
  transparent: true,
  visible: true,
  width: 1200,
  windowEffects: {
    effects: [Effect.Tabbed, Effect.Mica, Effect.Acrylic]
  }
}

const WINDOW: WindowConfigure = {
  bookmark: DEfAULT,
  calendar: {
    ...DEfAULT,
    width: 600,
    minWidth: 600,
    height: 400,
    minHeight: 400,
    windowEffects: undefined
  },
  clipchamp: DEfAULT,
  clock: DEfAULT,
  code: DEfAULT,
  collection: DEfAULT,
  developer: DEfAULT,
  example: DEfAULT,
  gallery: DEfAULT,
  intelligence: DEfAULT,
  markdown: DEfAULT,
  marketplace: DEfAULT,
  navigation: DEfAULT,
  screenshot: {
    ...DEfAULT,
    fullscreen: false
  },
  settings: DEfAULT,
  signboard: DEfAULT
}

export { WINDOW }
