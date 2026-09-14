import type {
  ChatModelPort,
  ChatPortEvent,
  ChatPortRequest,
  ChatStreamEvent,
  ChatTarget
} from '@i-thinking/chat/ports'

/**
 * 模型端口（渲染进程实现）：走 `itc.assistant` 的 MessagePort 到主进程。
 *
 * 主进程持有 provider 的 apiKey 并真正发请求，这里只负责：
 * 建连（端口异步到达，先排队）→ 发 `start` → 收事件 → `finish`/`error`/`aborted` 收束。
 */

interface EventQueue<T> {
  push: (item: T) => void
  close: () => void
  drain: () => AsyncGenerator<T>
}

/** 把推消息转成可 `for await` 的序列（队列 + 等待者） */
function buildEventQueue<T>(): EventQueue<T> {
  const items: T[] = []
  const waiters: Array<(value: IteratorResult<T>) => void> = []
  let closed = false

  function push(item: T): void {
    if (closed) return

    const waiter = waiters.shift()
    if (waiter) waiter({ value: item, done: false })
    else items.push(item)
  }

  function close(): void {
    closed = true
    waiters.splice(0).forEach(function (waiter) {
      waiter({ value: undefined as never, done: true })
    })
  }

  function next(): Promise<IteratorResult<T>> {
    const item = items.shift()
    if (item !== undefined) return Promise.resolve({ value: item, done: false })
    if (closed) return Promise.resolve({ value: undefined as never, done: true })

    return new Promise(function (resolve) {
      waiters.push(resolve)
    })
  }

  async function* drain(): AsyncGenerator<T> {
    while (true) {
      const result = await next()
      if (result.done) return
      yield result.value
    }
  }

  return { push, close, drain }
}

/** 端口会话：懒建连，端口到达前的调用先排队 */
function createPortSession() {
  let channel: MessagePort | null = null
  const waiting: Array<(value: MessagePort) => void> = []
  let listening = false

  function listen(): void {
    if (listening) return
    listening = true

    itc.assistant.onPort(function (next) {
      channel = next
      waiting.splice(0).forEach(function (resolve) {
        resolve(next)
      })
    })
  }

  async function findPort(): Promise<MessagePort> {
    if (channel) return channel

    listen()
    const pending = new Promise<MessagePort>(function (resolve) {
      waiting.push(resolve)
    })
    await itc.assistant.connect()
    return pending
  }

  return { findPort }
}

/** 端口事件带 `runID`（一个端口可跑多个运行）；对外只暴露共享事件形状 */
function toStreamEvent(event: ChatPortEvent): ChatStreamEvent {
  const { runID, ...rest } = event
  void runID
  return rest
}

function isFinal(event: ChatStreamEvent): boolean {
  return event.kind === 'finish' || event.kind === 'error' || event.kind === 'aborted'
}

/** 渲染进程看到的 provider 行 */
type ProviderRow = Awaited<ReturnType<typeof itc.chat.provider.toRead>>[number]

/** 设置里的选择：providerID 显式指定，model 覆盖 provider 默认 */
export type ModelSelection = {
  providerID: string | null
  model: string
}

/** 可选 provider：启用且有可用模型（默认模型或模型列表） */
export function findUsableProviders(providers: ProviderRow[]): ProviderRow[] {
  return providers.filter(function (provider) {
    return provider.enabled && Boolean(provider.model || provider.models?.length)
  })
}

/** 选中 provider：显式选择优先，否则第一个可用的（IPC 已按名称排序，结果稳定） */
export function findSelectedProvider(
  providers: ProviderRow[],
  selection: ModelSelection
): ProviderRow | null {
  const usable = findUsableProviders(providers)

  if (!selection.providerID) return usable[0] ?? null

  const picked = usable.find(function (provider) {
    return provider.id === selection.providerID
  })
  return picked ?? usable[0] ?? null
}

/** 实际模型：设置覆盖 → provider 默认 → 模型列表首项 */
export function resolveTarget(
  providers: ProviderRow[],
  selection: ModelSelection
): ChatTarget | null {
  const provider = findSelectedProvider(providers, selection)
  if (!provider) return null

  const model = selection.model.trim() || provider.model || provider.models?.[0] || ''
  return model ? { providerID: provider.id, model } : null
}

function createModelPort(findSelection: () => ModelSelection): ChatModelPort {
  const session = createPortSession()

  return {
    /** 当前选中的本地 provider/模型 */
    async findTarget(): Promise<ChatTarget | null> {
      return resolveTarget(await itc.chat.provider.toRead(), findSelection())
    },

    async *run(input, signal) {
      const channel = await session.findPort()
      const runID = crypto.randomUUID()
      const queue = buildEventQueue<ChatStreamEvent>()

      function listener(event: MessageEvent) {
        const data = event.data as ChatPortEvent
        if (data.runID !== runID) return

        const streamEvent = toStreamEvent(data)
        queue.push(streamEvent)
        if (isFinal(streamEvent)) queue.close()
      }

      function abort() {
        const request: ChatPortRequest = { kind: 'abort', runID }
        channel.postMessage(request)
      }

      channel.addEventListener('message', listener)
      signal.addEventListener('abort', abort)

      try {
        const request: ChatPortRequest = { kind: 'start', runID, ...input }
        channel.postMessage(request)

        for await (const streamEvent of queue.drain()) {
          yield streamEvent
        }
      } finally {
        channel.removeEventListener('message', listener)
        signal.removeEventListener('abort', abort)
      }
    }
  }
}

export { createModelPort }