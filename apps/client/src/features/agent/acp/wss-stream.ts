/**
 * 指纹 pinning 的 WebSocket 适配：经 Rust goose:acp-* 建立 WSS。
 * send 对外同步，对内串行 await invoke，保证 JSON-RPC 顺序。
 */
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { WebSocketConstructor } from '@agentclientprotocol/sdk/experimental/ws-client'

const SOCKET_CONNECTING = 0
const SOCKET_OPEN = 1
const SOCKET_CLOSING = 2
const SOCKET_CLOSED = 3

type SocketListener = (event: unknown) => void

interface AcpMessagePayload {
  id: string
  data: string
}

interface AcpIdPayload {
  id: string
}

interface AcpErrorPayload {
  id: string
  message: string
}

class GoosePinnedWebSocket {
  readyState = SOCKET_CONNECTING
  private connectionId: string | null = null
  private listeners = new Map<string, Set<SocketListener>>()
  private unlisteners: UnlistenFn[] = []
  private closed = false
  private sendQueue: Promise<void> = Promise.resolve()
  private url: string
  private fingerprint: string

  constructor(url: string, fingerprint: string) {
    this.url = url
    this.fingerprint = fingerprint
    void this.open()
  }

  addEventListener(type: string, listener: SocketListener) {
    const bucket = this.listeners.get(type) ?? new Set()
    bucket.add(listener)
    this.listeners.set(type, bucket)
  }

  removeEventListener(type: string, listener: SocketListener) {
    this.listeners.get(type)?.delete(listener)
  }

  send(data: string) {
    if (!this.connectionId || this.readyState !== SOCKET_OPEN) {
      throw new Error('ACP WSS 尚未打开')
    }
    const id = this.connectionId
    const socket = this
    this.sendQueue = this.sendQueue
      .then(function () {
        return invoke('goose:acp-send', { id, data }) as Promise<void>
      })
      .catch(function (error) {
        socket.emit('error', error)
      })
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.readyState = SOCKET_CLOSING
    const id = this.connectionId
    this.connectionId = null
    for (const unlisten of this.unlisteners.splice(0)) {
      unlisten()
    }
    if (id) {
      void invoke('goose:acp-close', { id }).catch(function () {
        return undefined
      })
    }
    this.readyState = SOCKET_CLOSED
    this.emit('close', {})
  }

  private async open() {
    try {
      const socket = this
      const [messageUnlisten, closeUnlisten, errorUnlisten] = await Promise.all([
        listen<AcpMessagePayload>('goose://acp-message', function (event) {
          if (!socket.connectionId || event.payload.id !== socket.connectionId) return
          socket.emit('message', { data: event.payload.data })
        }),
        listen<AcpIdPayload>('goose://acp-close', function (event) {
          if (!socket.connectionId || event.payload.id !== socket.connectionId) return
          socket.close()
        }),
        listen<AcpErrorPayload>('goose://acp-error', function (event) {
          if (!socket.connectionId || event.payload.id !== socket.connectionId) return
          socket.emit('error', new Error(event.payload.message))
        })
      ])
      this.unlisteners.push(messageUnlisten, closeUnlisten, errorUnlisten)

      const id = await invoke<string>('goose:acp-open', {
        url: this.url,
        fingerprint: this.fingerprint
      })
      if (this.closed) {
        await invoke('goose:acp-close', { id }).catch(function () {
          return undefined
        })
        return
      }
      this.connectionId = id
      this.readyState = SOCKET_OPEN
      this.emit('open', {})
    } catch (error) {
      this.readyState = SOCKET_CLOSED
      this.emit('error', error)
      this.emit('close', {})
    }
  }

  private emit(type: string, event: unknown) {
    const bucket = this.listeners.get(type)
    if (!bucket) return
    for (const listener of bucket) {
      listener(event)
    }
  }
}

function createPinnedWebSocketCtor(fingerprint: string): WebSocketConstructor {
  return class PinnedWebSocket extends GoosePinnedWebSocket {
    constructor(url: string) {
      super(url, fingerprint)
    }
  } as unknown as WebSocketConstructor
}

export { createPinnedWebSocketCtor }
