import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import net from 'node:net'
import path from 'node:path'
import { createInterface } from 'node:readline'

import type { Logger } from '@main/logger'
import {
  COREX_DAEMON,
  COREX_SOCKET_ENV,
  COREX_TOKEN_ENV,
  INVOKE_TIMEOUT_MS,
  PING_INTERVAL_MS,
  READY_TIMEOUT_MS,
  STOP_TIMEOUT_MS
} from './constants'
import { findDaemonPath, findDefaultIpcEndpoint, hasBinary } from './paths'

interface RpcErrorBody {
  code?: number
  message?: string
}

interface RpcResponse {
  type: string
  id?: number
  data?: unknown
  error?: RpcErrorBody
}

/**
 * Host for layenbrank/corex `corex-daemon` (NDJSON over named pipe / unix socket).
 * Not the deleted Studio stub that spoke a custom stdin `serve` protocol.
 */
class CorexHost {
  private readonly logger: Logger
  private child: ChildProcessWithoutNullStreams | null = null
  private isReady = false
  private version = ''
  private actions: string[] = []
  private authToken = ''
  private requestId = 1
  private endpoint = ''

  constructor(logger: Logger) {
    this.logger = logger.child('corex')
  }

  findActions(): readonly string[] {
    return this.actions
  }

  findVersion(): string {
    return this.version
  }

  hasAction(actionId: string): boolean {
    return this.actions.includes(actionId)
  }

  isRunning(): boolean {
    return this.isReady && this.child !== null
  }

  async start(): Promise<void> {
    if (this.isReady) {
      return
    }

    if (!hasBinary(COREX_DAEMON)) {
      throw new Error(`corex-daemon not found at ${findDaemonPath()}`)
    }

    this.authToken = process.env[COREX_TOKEN_ENV]?.trim() || randomBytes(32).toString('hex')
    process.env[COREX_TOKEN_ENV] = this.authToken
    this.endpoint = process.env[COREX_SOCKET_ENV]?.trim() || findDefaultIpcEndpoint()

    const daemonPath = findDaemonPath()
    const child = spawn(daemonPath, ['--socket', this.endpoint], {
      stdio: 'pipe',
      shell: false,
      windowsHide: true,
      cwd: path.dirname(daemonPath),
      env: {
        ...process.env,
        [COREX_TOKEN_ENV]: this.authToken
      }
    })
    this.child = child

    child.on('error', (err) => {
      this.logger.error('corex-daemon process error', err)
      this.markNotReady(String(err))
    })

    child.on('exit', (code, signal) => {
      this.logger.warn('corex-daemon exited', { code, signal })
      this.markNotReady(`corex-daemon exited (code=${code}, signal=${signal})`)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim()
      if (text) {
        this.logger.warn('corex-daemon stderr', { text })
      }
    })

    await this.waitUntilReady()
    await this.refreshActions()
    this.isReady = true
    this.logger.info('corex-daemon ready', {
      endpoint: this.endpoint,
      actions: this.actions.length
    })
  }

  /** Invoke a single Corex Action by id (e.g. capture.screenshot). */
  async invokeAction(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.isReady) {
      throw new Error('corex is not ready')
    }
    const id = this.requestId++
    const response = await this.exchange({
      type: 'invoke',
      id,
      auth_token: this.authToken,
      action,
      params
    })
    return parseOkData(response)
  }

  async stop(): Promise<void> {
    if (!this.child) {
      return
    }

    try {
      if (this.isReady) {
        await Promise.race([
          this.exchange({
            type: 'shutdown',
            id: this.requestId++,
            auth_token: this.authToken
          }),
          sleep(STOP_TIMEOUT_MS)
        ])
      }
    } catch (error) {
      this.logger.warn('corex shutdown request failed', error)
    }

    await this.killChild()
  }

  private async waitUntilReady(): Promise<void> {
    const deadline = Date.now() + READY_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (!this.child || this.child.killed) {
        throw new Error('corex-daemon exited before ready')
      }
      try {
        const response = await this.exchange({
          type: 'ping',
          id: this.requestId++,
          auth_token: this.authToken
        })
        if (response.type === 'pong' || response.type === 'ok') {
          return
        }
      } catch {
        // retry until timeout
      }
      await sleep(PING_INTERVAL_MS)
    }
    throw new Error('corex-daemon ready timeout')
  }

  private async refreshActions(): Promise<void> {
    try {
      const response = await this.exchange({
        type: 'list_actions',
        id: this.requestId++,
        auth_token: this.authToken
      })
      this.actions = parseActionIds(parseOkData(response))
    } catch (error) {
      this.logger.warn('list_actions failed', error)
      this.actions = []
    }
  }

  private exchange(payload: Record<string, unknown>): Promise<RpcResponse> {
    const line = `${JSON.stringify(payload)}\n`
    const endpoint = this.endpoint

    return new Promise(function (resolve, reject) {
      let isSettled = false
      const socket = new net.Socket()

      function finish(error: Error | null, value?: RpcResponse) {
        if (isSettled) {
          return
        }
        isSettled = true
        clearTimeout(timer)
        socket.removeAllListeners()
        if (!socket.destroyed) {
          socket.destroy()
        }
        if (error) {
          reject(error)
          return
        }
        resolve(value as RpcResponse)
      }

      const timer = setTimeout(function () {
        finish(new Error(`corex IPC timeout: ${String(payload.type)}`))
      }, INVOKE_TIMEOUT_MS)

      // 必须在 connect 前挂上，且用 on（非 once）：ENOENT 后 destroy 可能再发 error
      socket.on('error', function (err) {
        finish(err instanceof Error ? err : new Error(String(err)))
      })

      socket.connect({ path: endpoint }, function () {
        const reader = createInterface({ input: socket })
        reader.on('error', function (err) {
          finish(err instanceof Error ? err : new Error(String(err)))
        })
        reader.on('line', function (raw) {
          reader.close()
          try {
            finish(null, JSON.parse(raw) as RpcResponse)
          } catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)))
          }
        })
        socket.write(line)
      })
    })
  }

  private markNotReady(reason: string): void {
    this.isReady = false
    this.actions = []
    this.logger.warn('corex not ready', { reason })
  }

  private async killChild(): Promise<void> {
    const child = this.child
    this.child = null
    this.isReady = false
    this.actions = []

    if (!child || child.killed) {
      return
    }

    await new Promise<void>(function (resolve) {
      const timer = setTimeout(function () {
        try {
          child.kill()
        } catch {
          // ignore
        }
        resolve()
      }, STOP_TIMEOUT_MS)

      child.once('exit', function () {
        clearTimeout(timer)
        resolve()
      })

      try {
        child.kill()
      } catch {
        clearTimeout(timer)
        resolve()
      }
    })
  }
}

function parseOkData(response: RpcResponse): unknown {
  if (response.type === 'ok') {
    return response.data
  }
  if (response.type === 'pong') {
    return { pong: true }
  }
  if (response.type === 'error') {
    const code = response.error?.code ?? 'unknown'
    const message = response.error?.message ?? 'corex invoke failed'
    throw new Error(`[${code}] ${message}`)
  }
  throw new Error(`unexpected corex response type: ${response.type}`)
}

/**
 * corex `list_actions` 返回 `[{ id, name, description }, …]`（见 bins/daemon）。
 * 兼容纯 string[] / `{ actions: … }`。
 */
function parseActionIds(data: unknown): string[] {
  const items = findActionItems(data)
  const ids: string[] = []
  for (const item of items) {
    if (typeof item === 'string' && item.length > 0) {
      ids.push(item)
      continue
    }
    if (!item || typeof item !== 'object') {
      continue
    }
    const id = (item as { id?: unknown }).id
    if (typeof id === 'string' && id.length > 0) {
      ids.push(id)
    }
  }
  return ids
}

function findActionItems(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object' && Array.isArray((data as { actions?: unknown }).actions)) {
    return (data as { actions: unknown[] }).actions
  }
  return []
}

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

export { CorexHost, parseActionIds }
