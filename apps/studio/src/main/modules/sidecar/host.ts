import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import net from 'node:net'
import path from 'node:path'
import { createInterface } from 'node:readline'

import type { Logger } from '@main/logger'
import {
  COREX_DAEMON,
  COREX_PIPE,
  COREX_SOCKET_ENV,
  COREX_TOKEN_ENV,
  INVOKE_TIMEOUT_MS,
  PING_INTERVAL_MS,
  READY_TIMEOUT_MS,
  STOP_TIMEOUT_MS
} from './constants'
import { findDaemonPath, hasBinary } from './paths'

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

  /** @deprecated prefer findActions — kept for status shape compatibility */
  findModules(): readonly string[] {
    return this.actions
  }

  findVersion(): string {
    return this.version
  }

  hasAction(actionId: string): boolean {
    return this.actions.includes(actionId)
  }

  hasModule(name: string): boolean {
    if (name === 'screenshot' || name === 'capture') {
      return this.hasAction('capture.screenshot')
    }
    return this.actions.some(function (action) {
      return action === name || action.startsWith(`${name}.`)
    })
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
    this.endpoint = process.env[COREX_SOCKET_ENV]?.trim() || findDefaultEndpoint()

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

  /**
   * Legacy Studio stub method name → Action invoke.
   * Prefer `invokeAction('capture.screenshot', …)`.
   */
  async invoke(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const action = mapLegacyMethod(method)
    return this.invokeAction(action, mapLegacyParams(action, params))
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
      const data = parseOkData(response)
      if (Array.isArray(data)) {
        this.actions = data.map(String)
      } else if (data && typeof data === 'object' && Array.isArray((data as { actions?: unknown }).actions)) {
        this.actions = ((data as { actions: unknown[] }).actions).map(String)
      }
    } catch (error) {
      this.logger.warn('list_actions failed', error)
      this.actions = []
    }
  }

  private exchange(payload: Record<string, unknown>): Promise<RpcResponse> {
    const line = `${JSON.stringify(payload)}\n`
    const endpoint = this.endpoint

    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        socket.destroy()
        reject(new Error(`corex IPC timeout: ${String(payload.type)}`))
      }, INVOKE_TIMEOUT_MS)

      const socket = net.createConnection({ path: endpoint }, function () {
        socket.write(line)
      })

      const reader = createInterface({ input: socket })
      reader.on('line', function (raw) {
        clearTimeout(timer)
        reader.close()
        socket.end()
        try {
          resolve(JSON.parse(raw) as RpcResponse)
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })

      socket.on('error', function (err) {
        clearTimeout(timer)
        reject(err)
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

function findDefaultEndpoint(): string {
  if (process.platform === 'win32') {
    return COREX_PIPE
  }
  const hash = createHash('sha256').update(String(process.pid)).digest('hex').slice(0, 8)
  return path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', `corex-${hash}.sock`)
}

function mapLegacyMethod(method: string): string {
  if (method === 'screenshot.capture') {
    return 'capture.screenshot'
  }
  return method
}

function mapLegacyParams(action: string, params: Record<string, unknown>): Record<string, unknown> {
  if (action === 'capture.screenshot') {
    const to = params.to ?? params.output
    if (typeof to === 'string') {
      return { to }
    }
  }
  return params
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

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

export { CorexHost }
