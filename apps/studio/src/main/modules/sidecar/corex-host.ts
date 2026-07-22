import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface, type Interface } from 'node:readline'
import { randomUUID } from 'node:crypto'

import type { Logger } from '@main/logger'
import { findPlatformSidecars } from './allowlist'
import { SidecarService } from './service'

const READY_TIMEOUT_MS = 15_000
const INVOKE_TIMEOUT_MS = 60_000
const STOP_TIMEOUT_MS = 3_000

type ReadyPayload = {
  event: string
  version?: string
  modules?: string[]
}

type RpcResponse = {
  id: string
  ok: boolean
  data?: unknown
  error?: string
}

type PendingInvoke = {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

class CorexHost {
  private readonly sidecars: SidecarService
  private readonly logger: Logger
  private child: ChildProcessWithoutNullStreams | null = null
  private stdoutLines: Interface | null = null
  private isReady = false
  private modules: string[] = []
  private pending = new Map<string, PendingInvoke>()
  private writeChain: Promise<void> = Promise.resolve()
  private readyWaiter: {
    resolve: () => void
    reject: (error: Error) => void
  } | null = null

  constructor(sidecars: SidecarService, logger: Logger) {
    this.sidecars = sidecars
    this.logger = logger.child('corex')
  }

  findModules(): readonly string[] {
    return this.modules
  }

  hasModule(name: string): boolean {
    return this.modules.includes(name)
  }

  isRunning(): boolean {
    return this.isReady && this.child !== null
  }

  async start(): Promise<void> {
    if (this.isReady) {
      return
    }

    const name = findPlatformSidecars().find(function (item) {
      return item === 'corex' || item === 'corex.exe'
    })
    if (!name) {
      throw new Error('corex sidecar name not found for platform')
    }

    const sidecarPath = this.sidecars.findPath(name)
    const child = spawn(sidecarPath, ['serve'], {
      stdio: 'pipe',
      shell: false,
      windowsHide: true
    })
    this.child = child

    child.on('error', (err) => {
      this.logger.error('corex process error', err)
      this.markNotReady(String(err))
    })

    child.on('exit', (code, signal) => {
      this.logger.warn('corex exited', { code, signal })
      this.markNotReady(`corex exited (code=${code}, signal=${signal})`)
    })

    this.stdoutLines = createInterface({ input: child.stdout })
    this.stdoutLines.on('line', (line) => {
      this.onStdoutLine(line)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim()
      if (text) {
        this.logger.warn('corex stderr', { text })
      }
    })

    await this.waitForReady(child)
  }

  async invoke(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.isReady || !this.child?.stdin.writable) {
      throw new Error('corex is not ready')
    }

    const id = randomUUID()
    const payload = JSON.stringify({ id, method, params })

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`corex invoke timeout: ${method}`))
      }, INVOKE_TIMEOUT_MS)

      this.pending.set(id, { resolve, reject, timer })

      this.writeChain = this.writeChain
        .then(() => this.writeLine(payload))
        .catch((err) => {
          const pending = this.pending.get(id)
          if (!pending) {
            return
          }
          this.pending.delete(id)
          clearTimeout(pending.timer)
          pending.reject(err instanceof Error ? err : new Error(String(err)))
        })
    })
  }

  async stop(): Promise<void> {
    if (!this.child) {
      return
    }

    try {
      if (this.isReady) {
        await Promise.race([this.invoke('shutdown'), sleep(STOP_TIMEOUT_MS)])
      }
    } catch (error) {
      this.logger.warn('corex shutdown request failed', error)
    }

    await this.killChild()
  }

  private waitForReady(child: ChildProcessWithoutNullStreams): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyWaiter = null
        reject(new Error('corex ready timeout'))
      }, READY_TIMEOUT_MS)

      this.readyWaiter = {
        resolve: () => {
          clearTimeout(timer)
          this.readyWaiter = null
          resolve()
        },
        reject: (error) => {
          clearTimeout(timer)
          this.readyWaiter = null
          reject(error)
        }
      }

      child.once('exit', (code, signal) => {
        if (!this.readyWaiter) {
          return
        }
        this.readyWaiter.reject(
          new Error(`corex exited before ready (code=${code}, signal=${signal})`)
        )
      })
    })
  }

  private onStdoutLine(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) {
      return
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      this.logger.warn('corex non-json stdout', { line: trimmed })
      return
    }

    if (!this.isReady && parsed.event === 'ready') {
      const ready = parsed as unknown as ReadyPayload
      this.modules = Array.isArray(ready.modules) ? ready.modules : []
      this.isReady = true
      this.logger.info('corex ready', {
        version: ready.version,
        modules: this.modules
      })
      this.readyWaiter?.resolve()
      return
    }

    const response = parsed as unknown as RpcResponse
    if (!response.id) {
      return
    }

    const pending = this.pending.get(response.id)
    if (!pending) {
      return
    }
    this.pending.delete(response.id)
    clearTimeout(pending.timer)

    if (response.ok) {
      pending.resolve(response.data)
      return
    }
    pending.reject(new Error(response.error ?? 'corex invoke failed'))
  }

  private writeLine(line: string): Promise<void> {
    const child = this.child
    if (!child?.stdin.writable) {
      return Promise.reject(new Error('corex stdin not writable'))
    }
    return new Promise(function (resolve, reject) {
      child.stdin.write(`${line}\n`, function (err) {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  private markNotReady(reason: string): void {
    this.isReady = false
    if (this.readyWaiter) {
      this.readyWaiter.reject(new Error(reason))
      this.readyWaiter = null
    }
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
      this.pending.delete(id)
    }
  }

  private async killChild(): Promise<void> {
    const child = this.child
    this.child = null
    this.isReady = false
    this.modules = []
    this.stdoutLines?.close()
    this.stdoutLines = null

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

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

export { CorexHost }
