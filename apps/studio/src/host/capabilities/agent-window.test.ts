import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Context } from '../framework/context'
import { buildAgentWindowPort } from './agent-window'

/**
 * electron 在 vitest（纯 Node）里不可用，且 agent-window 会连带加载 security 的
 * `session` / `shell`，所以整体替换成最小可观测的假实现：只记录「建了几个窗、
 * 点了多少次 focus、加载了什么 URL」——正是本端口要保证的契约。
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
    toReadWindow() {
      return null
    },
    toUpdateWindow() {},
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

describe('agent window port', function () {
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

  it('opens the agent route in a new window', function () {
    const port = buildAgentWindowPort(stubCtx())

    port.toOpen()

    expect(state.windows).toHaveLength(1)
    expect(state.windows[0].loadedUrl).toBe('http://127.0.0.1:9523/#/agent/chat')
  })

  it('focuses the existing window instead of opening a second one', function () {
    const port = buildAgentWindowPort(stubCtx())

    port.toOpen()
    port.toOpen()

    expect(state.windows).toHaveLength(1)
    expect(state.focusCount).toBe(1)
  })

  it('restores a minimized window before focusing it', function () {
    const port = buildAgentWindowPort(stubCtx())

    port.toOpen()
    state.windows[0].minimized = true
    port.toOpen()

    expect(state.windows).toHaveLength(1)
    expect(state.restoreCount).toBe(1)
    expect(state.focusCount).toBe(1)
  })

  it('recreates the window after it was closed', function () {
    const port = buildAgentWindowPort(stubCtx())

    port.toOpen()
    state.windows[0].close()
    port.toOpen()

    expect(state.windows).toHaveLength(2)
    expect(state.windows[1].loadedUrl).toBe('http://127.0.0.1:9523/#/agent/chat')
  })
})
