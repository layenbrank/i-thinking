import { Effect } from '@tauri-apps/api/window'

import type { WebviewOptions } from '@tauri-apps/api/webview'
import type { WindowOptions } from '@tauri-apps/api/window'

type Configure = Omit<WebviewOptions, 'x' | 'y' | 'width' | 'height'> & WindowOptions

type WindowConfigure = Record<Application.Component, Configure>

const DEFAULT: Configure = {
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
  bookmark: DEFAULT,
  calendar: {
    ...DEFAULT,
    width: 600,
    minWidth: 600,
    height: 400,
    minHeight: 400,
    windowEffects: undefined
  },
  clipchamp: DEFAULT,
  clock: {
    ...DEFAULT,
    width: 480,
    minWidth: 360,
    height: 360,
    minHeight: 280,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    windowEffects: undefined
  },
  countdown: {
    ...DEFAULT,
    width: 400,
    minWidth: 360,
    height: 420,
    minHeight: 380,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    windowEffects: undefined
  },
  code: DEFAULT,
  collection: DEFAULT,
  developer: DEFAULT,
  example: DEFAULT,
  gallery: DEFAULT,
  intelligence: DEFAULT,
  markdown: DEFAULT,
  morph: {
    ...DEFAULT,
    windowEffects: undefined
  },
  marketplace: DEFAULT,
  navigation: DEFAULT,
  screenshot: {
    ...DEFAULT,
    fullscreen: false
  },
  settings: DEFAULT,
  signboard: DEFAULT
}

export { WINDOW }
