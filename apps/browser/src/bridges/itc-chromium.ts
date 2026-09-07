/**
 * chrome://i-thinking WebUI 下的 itc 实现。
 * - shell.open → 新标签（优先 chrome.send / ithinking.openTab）
 * - store → localStorage；缺失时用内存 Map（vitest）
 * - 其余 API 先 stub，避免 React 启动即崩
 */
import type { BrowserItc } from './itc'

interface ChromeSend {
  send(message: string, args?: unknown[]): void
}

interface IThinkingHost {
  openTab?(url: string): void
}

const STORE_PREFIX = 'i-thinking.store.'
const MEMORY_STORE = new Map<string, string>()

function findChromeSend(): ChromeSend | null {
  const chrome = (globalThis as { chrome?: ChromeSend }).chrome
  if (chrome && typeof chrome.send === 'function') return chrome
  return null
}

function findHost(): IThinkingHost | null {
  return (globalThis as { ithinking?: IThinkingHost }).ithinking ?? null
}

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

function storeKey(key: string): string {
  return `${STORE_PREFIX}${key}`
}

function readRaw(key: string): string | null {
  if (hasLocalStorage()) return localStorage.getItem(key)
  return MEMORY_STORE.get(key) ?? null
}

function writeRaw(key: string, value: string): void {
  if (hasLocalStorage()) {
    localStorage.setItem(key, value)
    return
  }
  MEMORY_STORE.set(key, value)
}

function removeRaw(key: string): void {
  if (hasLocalStorage()) {
    localStorage.removeItem(key)
    return
  }
  MEMORY_STORE.delete(key)
}

function listPrefixedKeys(): string[] {
  if (hasLocalStorage()) {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORE_PREFIX)) keys.push(key)
    }
    return keys
  }
  return [...MEMORY_STORE.keys()].filter(function (key) {
    return key.startsWith(STORE_PREFIX)
  })
}

function openTab(url: string): void {
  const host = findHost()
  if (host?.openTab) {
    host.openTab(url)
    return
  }
  const chrome = findChromeSend()
  if (chrome) return chrome.send('openTab', [url])

  window.open(url, '_blank', 'noopener,noreferrer')
}

function createChromiumItc(): BrowserItc {
  return {
    store: {
      async toRead(input) {
        const raw = readRaw(storeKey(input.key))
        if (raw === null) return null
        try {
          return JSON.parse(raw) as unknown
        } catch {
          return raw
        }
      },
      async toWrite(input) {
        writeRaw(storeKey(input.key), JSON.stringify(input.value))
      },
      async has(input) {
        return readRaw(storeKey(input.key)) !== null
      },
      async toRemove(input) {
        removeRaw(storeKey(input.key))
      },
      async clear() {
        for (const key of listPrefixedKeys()) removeRaw(key)
      },
      async keys() {
        return listPrefixedKeys().map(function (key) {
          return key.slice(STORE_PREFIX.length)
        })
      }
    },
    dialog: {
      async open() {
        return null
      },
      async save() {
        return null
      }
    },
    user: {
      async toRead() {
        return []
      },
      async toWrite() {
        throw new Error('itc.user.toWrite is not available in chrome://i-thinking yet')
      },
      async toUpdate() {
        throw new Error('itc.user.toUpdate is not available in chrome://i-thinking yet')
      },
      async toRemove() {
        throw new Error('itc.user.toRemove is not available in chrome://i-thinking yet')
      }
    },
    sidecar: {
      async toRead() {
        findChromeSend()?.send('sidecar.toRead')
        return {
          isReady: false,
          version: '',
          actions: [],
          hasCorex: false,
          hasPandoc: false
        }
      }
    },
    doc: {
      async convert() {
        throw new Error('itc.doc.convert is not available in chrome://i-thinking yet')
      }
    },
    screenshot: {
      async capture() {
        throw new Error('itc.screenshot.capture is not available in chrome://i-thinking yet')
      }
    },
    updater: {
      async toRead() {
        return {
          enabled: false,
          checking: false,
          downloading: false,
          downloaded: false,
          progress: null,
          version: null,
          error: null
        }
      },
      async check() {
        return {
          available: false,
          version: null,
          releaseNotes: null,
          reason: 'chromium-webui-stub'
        }
      },
      async download() {},
      async install() {},
      onEvent() {
        return function () {}
      }
    },
    devtools: {
      async toUpdate() {}
    },
    overlay: {
      async toRead() {
        return { visible: false }
      },
      async toUpdate() {}
    },
    shell: {
      async open(input) {
        openTab(input.url)
      }
    },
    app: {
      onMessage() {
        return function () {}
      }
    }
  }
}

function installChromiumItc(): BrowserItc {
  const itc = createChromiumItc()
  ;(globalThis as { itc?: BrowserItc }).itc = itc
  if (typeof window !== 'undefined') {
    window.itc = itc
  }
  return itc
}

export { createChromiumItc, installChromiumItc, openTab }
