import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'
import {
  MessageChannelMain,
  safeStorage,
  type MessagePortMain,
  type WebContents,
  type WebFrameMain
} from 'electron'
import Store from 'electron-store'

import { KeyStore, type SecretCipher, type SecretStore } from './assistant-key'
import {
  findErrorMessage,
  MAX_CONCURRENT_RUNS,
  parseInbound,
  toPortEvent,
  type PortEvent,
  type StartRequest
} from './assistant-protocol'
import type { Repository as ChatRepository } from './chat'
import { CHANNELS } from '../../shared/ipc/channels'

/** 只要求用到的两个级别，便于测试注入假 logger */
interface Log {
  info: (message: string) => void
  warn: (message: string, error?: unknown) => void
}

/**
 * 离线通路：主进程本地 provider（Ollama / LM Studio / vLLM 等 OpenAI 兼容端点）。
 *
 * 官方 Electron Pattern 2：
 * 1. 渲染进程 `itc.assistant.connect()`（invoke）；
 * 2. 主进程建 `MessageChannelMain`，把 port2 通过 `senderFrame.postMessage` 交出去；
 * 3. 之后全部走端口的**纯数据**协议（见 assistant-protocol.ts），主进程不暴露对象。
 *
 * 安全边界：
 * - 端口只在已登记且 URL 合规的 sender 上建立（host/ipc 装配层的 trusted-sender 校验）；
 * - apiKey 只留主进程（assistant-key.ts 的 safeStorage 存储），端口协议里没有它；
 * - 端口关闭 / 窗口销毁 → 该端口上所有运行立即 abort。
 */

/** 与 src/plugins/database.ts 同款：electron-store 的最小用法面适配 */
function toSecretStore(store: Store): SecretStore {
  return {
    has(key) {
      return store.has(key)
    },
    toRead(key) {
      return store.get(key) ?? null
    },
    toWrite(key, value) {
      store.set(key, value)
    },
    toRemove(key) {
      store.delete(key)
    }
  }
}

function buildCipher(): SecretCipher {
  return {
    isAvailable() {
      return safeStorage.isEncryptionAvailable()
    },
    encrypt(value) {
      return safeStorage.encryptString(value)
    },
    decrypt(value) {
      return safeStorage.decryptString(value)
    }
  }
}

/** KeyStore 的唯一构造点：旧插件路径与新的 handler 切片共用，不各建一份 */
export function buildKeyStore(): KeyStore {
  return new KeyStore(toSecretStore(new Store({ name: 'assistant-secrets' })), buildCipher())
}

/**
 * 端口写出封装：`MessagePortMain` 没有 `isClosed()`，自行跟一个标志位，
 * 避免在端口已关闭（窗口销毁等）时 postMessage 报错。
 */
interface PortSink {
  post: (event: PortEvent) => void
  close: () => void
}

function buildSink(port: MessagePortMain): PortSink {
  let closed = false
  port.on('close', function () {
    closed = true
  })

  return {
    post(event) {
      if (closed) return
      port.postMessage(event)
    },
    close() {
      closed = true
      port.close()
    }
  }
}

async function run(
  request: StartRequest,
  sink: PortSink,
  runs: Map<string, AbortController>,
  keys: KeyStore,
  chat: ChatRepository,
  log: Log
): Promise<void> {
  const controller = new AbortController()
  runs.set(request.runID, controller)

  try {
    const provider = await chat.findProvider(request.providerID)
    if (!provider) throw new Error(`provider 不存在: ${request.providerID}`)
    if (!provider.baseUrl) throw new Error(`provider 缺少 baseUrl: ${provider.id}`)

    const apiKey = keys.findKey(provider.id)
    const local = createOpenAICompatible({
      name: provider.kind,
      baseURL: provider.baseUrl,
      ...(apiKey ? { apiKey } : {})
    })

    const result = streamText({
      model: local.chatModel(request.model),
      ...(request.system ? { system: request.system } : {}),
      messages: request.messages,
      abortSignal: controller.signal
    })

    for await (const part of result.fullStream) {
      const event = toPortEvent(part, request.runID)
      if (event) sink.post(event)
    }
  } catch (error) {
    sink.post({ kind: 'error', runID: request.runID, message: findErrorMessage(error) })
    log.warn('run failed', error)
  } finally {
    runs.delete(request.runID)
  }
}

function connect(
  frame: WebFrameMain,
  sender: WebContents,
  keys: KeyStore,
  chat: ChatRepository,
  log: Log
): void {
  const channel = new MessageChannelMain()
  const port = channel.port1
  const sink = buildSink(port)
  const runs = new Map<string, AbortController>()

  port.on('message', function (event) {
    const request = parseInbound(event.data)
    if (!request) {
      log.warn('rejected malformed port message')
      return
    }
    if (request.kind === 'abort') {
      runs.get(request.runID)?.abort()
      return
    }
    if (runs.size >= MAX_CONCURRENT_RUNS) {
      sink.post({ kind: 'error', runID: request.runID, message: '并发运行数已达上限' })
      return
    }
    void run(request, sink, runs, keys, chat, log)
  })

  function abortAll() {
    runs.forEach(function (controller) {
      controller.abort()
    })
    runs.clear()
  }

  port.on('close', function () {
    abortAll()
  })
  sender.once('destroyed', function () {
    abortAll()
    sink.close()
  })

  port.start()
  frame.postMessage(CHANNELS.ASSISTANT.PORT, null, [channel.port2])
  log.info('port attached')
}

export { connect }
export type { Log }
