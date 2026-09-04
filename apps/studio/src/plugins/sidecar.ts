import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline'

import { CHANNELS } from './channels'
import type { Context } from './context'
import { registerHandler } from './handle'
import type { Logger } from './logger'
import type { Plugin } from './module'

const READY_TIMEOUT_MS = 15_000
const INVOKE_TIMEOUT_MS = 60_000
const STOP_TIMEOUT_MS = 3_000
const PING_INTERVAL_MS = 200

const COREX_CLI = 'corex'
const COREX_DAEMON = 'corex-daemon'
const PANDOC_BINARY = 'pandoc'

/** Corex 官方默认 Windows named pipe（`ipc_endpoint`）；可用 COREX_SOCKET 覆盖。 */
const COREX_PIPE = String.raw`\\.\pipe\corex`
const COREX_SOCKET_ENV = 'COREX_SOCKET'
const COREX_TOKEN_ENV = 'COREX_TOKEN'

function findPlatformKey(platform = process.platform, arch = process.arch): string {
  return `${platform}-${arch}`
}

function findBinaryName(name: string, platform = process.platform): string {
  return platform === 'win32' ? `${name}.exe` : name
}

function isPackagedApp(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as { app?: { isPackaged?: boolean } }
    return Boolean(electron.app?.isPackaged)
  } catch {
    return false
  }
}

/** Packaged: resources/sidecar；开发: sidecar/staging/<platform> */
function findSidecarRoot(): string {
  if (isPackagedApp()) {
    return path.join(process.resourcesPath, 'sidecar')
  }
  const root = process.env.APP_ROOT ?? process.cwd()
  return path.join(root, 'sidecar', 'staging', findPlatformKey())
}

function findBinaryPath(name: string): string {
  return path.join(findSidecarRoot(), findBinaryName(name))
}

function findDaemonPath(): string {
  return findBinaryPath(COREX_DAEMON)
}

function findCliPath(): string {
  return findBinaryPath(COREX_CLI)
}

function findPandocPath(): string {
  return findBinaryPath(PANDOC_BINARY)
}

function hasBinary(name: string): boolean {
  return existsSync(findBinaryPath(name))
}

/**
 * 对齐 corex `crates/ipc` `data_dir()`：
 * 可写 exe 目录 → OS 项目数据目录 → `.corex`
 */
function findCorexDataDir(): string {
  const exeDir = path.dirname(findDaemonPath())
  if (isWritableDir(exeDir)) {
    return exeDir
  }

  const projectData = findOsCorexDataDir()
  ensureDir(projectData)
  if (isWritableDir(projectData)) {
    return projectData
  }

  const fallback = path.join(process.cwd(), '.corex')
  ensureDir(fallback)
  return fallback
}

/**
 * 对齐 corex `ipc_endpoint(data)`：
 * Windows `\\.\pipe\corex`；Unix `<data_dir>/corex.sock`
 */
function findDefaultIpcEndpoint(): string {
  if (process.platform === 'win32') {
    return COREX_PIPE
  }
  return path.join(findCorexDataDir(), 'corex.sock')
}

function findOsCorexDataDir(): string {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(base, 'corex')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'corex')
  }
  const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  return path.join(xdg, 'corex')
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function isWritableDir(dir: string): boolean {
  if (!existsSync(dir)) {
    return false
  }
  const probe = path.join(dir, '.corex-write-check')
  try {
    writeFileSync(probe, '')
    unlinkSync(probe)
    return true
  } catch {
    try {
      openSync(dir, 'r')
    } catch {
      // ignore
    }
    return false
  }
}

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

interface FindStatusR {
  isReady: boolean
  version: string
  actions: string[]
  hasCorex: boolean
  hasPandoc: boolean
}

function findStatus(corex: CorexHost): FindStatusR {
  return {
    isReady: corex.isRunning(),
    version: corex.findVersion(),
    actions: [...corex.findActions()],
    hasCorex: hasBinary(COREX_DAEMON),
    hasPandoc: hasBinary(PANDOC_BINARY)
  }
}

function buildPlugin(): Plugin {
  let corex: CorexHost | null = null

  return {
    name: 'sidecar',
    register(ctx: Context) {
      corex = ctx.corex
      registerHandler(ctx, CHANNELS.SIDECAR.READ, null, function () {
        return findStatus(ctx.corex)
      })

      const log = ctx.logger.child('sidecar')
      void ctx.corex
        .start()
        .then(function () {
          log.info('registered', {
            corexActionCount: ctx.corex.findActions().length,
            hasScreenshot: ctx.corex.hasAction('capture.screenshot'),
            version: ctx.corex.findVersion()
          })
        })
        .catch(function (error) {
          log.error('corex start failed (degraded)', error)
        })
    },
    async dispose() {
      if (!corex) {
        return
      }
      await corex.stop()
    }
  }
}

export {
  buildPlugin,
  COREX_CLI,
  COREX_DAEMON,
  COREX_PIPE,
  COREX_SOCKET_ENV,
  COREX_TOKEN_ENV,
  CorexHost,
  findBinaryName,
  findBinaryPath,
  findCliPath,
  findCorexDataDir,
  findDaemonPath,
  findDefaultIpcEndpoint,
  findPandocPath,
  findPlatformKey,
  findSidecarRoot,
  findStatus,
  hasBinary,
  INVOKE_TIMEOUT_MS,
  PANDOC_BINARY,
  parseActionIds,
  PING_INTERVAL_MS,
  READY_TIMEOUT_MS,
  STOP_TIMEOUT_MS
}
export type { FindStatusR }
