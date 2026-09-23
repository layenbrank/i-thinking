import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LAZY_WINDOW_KEYS } from '../../shared/windows'
import type { Context } from '../framework/context'
import { buildWindowPorts } from './window-registry'

/**
 * electron 在 vitest（纯 Node）里不可用，且建窗会连带加载 security 的 `session` / `shell`，
 * 所以整体替换成最小可观测的假实现：只记录「建了几个窗、点了多少次 focus、加载了什么 URL」
 * —— 正是端口要保证的契约。规格表的每个键都按同一组断言跑一遍，避免只测了 agent。
 */
const state = vi.hoisted(function () {
  return {
    windows: [] as Array<{
      destroyed: boolean
      minimized: boolean
      loadedUrl: string | null
      close(): void
    }>,
    focusCount: 0,
    restoreCount: 0
  }
})

vi.mock('electron', function () {
  class FakeBrowserWindow {
    destroyed = false
    minimized = false
    loadedUrl: string | null = null
    alreadyShown = false
    webContents = {
      on() {},
      setWindowOpenHandler() {
        return { action: 'deny' as const }
      },
      isDestroyed() {
        return false
      }
    }

    constructor() {
      state.windows.push(this)
    }

    isDestroyed() {
      return this.destroyed
    }

    isMinimized() {
      return this.minimized
    }

    restore() {
      state.restoreCount += 1
      this.minimized = false
    }

    focus() {
      state.focusCount += 1
    }

    close() {
      this.destroyed = true
    }

    loadURL(url: string) {
      this.loadedUrl = url
    }

    loadFile(file: string) {
      this.loadedUrl = file
    }

    once() {}

    on() {}
  }

  return {
    BrowserWindow: FakeBrowserWindow,
    // window-factory 的图标解析要问 `app.isPackaged`
    app: { isPackaged: false },
    session: {
      defaultSession: {
        setPermissionRequestHandler() {},
        webRequest: {
          onHeadersReceived() {}
        }
      }
    },
    shell: { openExternal() {} }
  }
})

function stubCtx(): Context {
  return {
    app: {} as Context['app'],
    ipc: {} as Context['ipc'],
    isDev: true,
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
      child() {
        return this
      }
    },
    corex: {} as Context['corex'],
    trustWebContents() {},
    untrustWebContents() {},
    isTrustedWebContents() {
      return true
    },
    toReadOrigins() {
      return []
    },
    toUpdateOrigins() {}
  }
}

describe('lazy window ports', function () {
  beforeEach(function () {
    state.windows.length = 0
    state.focusCount = 0
    state.restoreCount = 0
    // 这两个全局由 Forge 的 vite 插件在打包时注入，测试里得自己挂
    vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window')
    vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', 'http://127.0.0.1:9523/')
  })

  afterEach(function () {
    vi.unstubAllGlobals()
  })

  it('opens every declared key at its own route', function () {
    const ports = buildWindowPorts(stubCtx())

    for (const key of LAZY_WINDOW_KEYS) ports[key].toOpen()

    expect(state.windows.map((win) => win.loadedUrl)).toEqual([
      'http://127.0.0.1:9523/#/agent/chat',
      'http://127.0.0.1:9523/#/directive'
    ])
  })

  it.each(LAZY_WINDOW_KEYS)(
    'focuses the %s window instead of opening a second one',
    function (key) {
      const ports = buildWindowPorts(stubCtx())

      ports[key].toOpen()
      ports[key].toOpen()

      expect(state.windows).toHaveLength(1)
      expect(state.focusCount).toBe(1)
    }
  )

  it.each(LAZY_WINDOW_KEYS)('restores the %s window before focusing it', function (key) {
    const ports = buildWindowPorts(stubCtx())

    ports[key].toOpen()
    state.windows[0].minimized = true
    ports[key].toOpen()

    expect(state.restoreCount).toBe(1)
    expect(state.focusCount).toBe(1)
    expect(state.windows).toHaveLength(1)
  })

  it.each(LAZY_WINDOW_KEYS)('rebuilds the %s window after it was destroyed', function (key) {
    const ports = buildWindowPorts(stubCtx())

    ports[key].toOpen()
    state.windows[0].close()
    ports[key].toOpen()

    expect(state.windows).toHaveLength(2)
  })
})
