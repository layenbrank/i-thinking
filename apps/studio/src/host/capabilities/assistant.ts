import {
  MessageChannelMain,
  safeStorage,
  type MessagePortMain,
  type WebContents,
  type WebFrameMain
} from 'electron'
import Store from 'electron-store'

import { CHANNELS } from '../../shared/ipc/channels'
import { MAX_CONCURRENT_RUNS, receiveInbound, type Log, type PortEvent } from './assistant-protocol'
import { KeyStore, type SecretCipher, type SecretStore } from './assistant-key'
import type { Repository as ChatRepository } from './chat'
import { disposeEngine, findEngine, type RunContext } from './opencode/engine'

/**
 * agent 通路的**装配层**：把渲染进程的 MessagePort 接到 opencode 运行时上。
 *
 * 真正跑 agent 的是 `opencode/engine.ts`（内嵌一个 `opencode serve`）。这个文件只管
 * 三件与 Electron 强相关的事，其余一概不碰：
 * 1. 建 `MessageChannelMain`，把 port2 交给渲染进程（官方 Electron Pattern 2）；
 * 2. 把端口上的纯数据消息翻译成引擎的调用 / 审批回执 / abort；
 * 3. 端口关闭或窗口销毁时，把该端口上所有运行取消掉。
 *
 * 安全边界：
 * - 端口只在已登记且 URL 合规的 sender 上建立（host/ipc 装配层的 trusted-sender 校验）；
 * - BYOK 的 apiKey 只留主进程（assistant-key.ts 的 safeStorage 存储），端口协议里没有它；
 * - provider 凭据经 `OPENCODE_CONFIG_CONTENT` 注入子进程，不落盘；
 * - 平台令牌是渲染进程的登录态，只随请求透传（主进程不落盘、不记日志）；
 * - 端口关闭 / 窗口销毁 → 该端口上所有运行立即 abort。
 */

/** 审批回执落空时回给界面的一句话（与 `tool-card.tsx` 的失效提示同义） */
const STALE_APPROVAL_MESSAGE = '这次审批已经失效，请重新发送'

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
  const engine = findEngine({ chat, keys, log })
  const runs = new Map<string, RunContext>()

  port.on('message', function (event) {
    const outcome = receiveInbound(event.data)
    if (outcome.kind === 'rejected') {
      // 带上拒收原因：这句日志是「界面只显示一句被拒绝」时唯一能定位的线索
      //（zod 的字段路径由 `receiveInbound` 先打在 stdout 上）
      log.warn(
        outcome.event
          ? `rejected port start request: ${outcome.event.message}`
          : 'rejected port message (no run to answer)'
      )
      // 拒了就必须回话：渲染进程发完 `start` 在等终态，沉默 = 这次运行永远挂住
      if (outcome.event) sink.post(outcome.event)
      return
    }

    const request = outcome.request
    if (request.kind === 'abort') {
      const context = runs.get(request.runID)
      if (!context) {
        // 没有可取消的东西（运行已结束，或端口重连前的旧 runID）：留痕即可，
        // 界面那边这次流的终态早就到了，回事件反而多出一个
        log.info(`dropped abort for unknown run ${request.runID}`)
        return
      }
      context.controller.abort()
      return
    }
    if (request.kind === 'tool-approval') {
      const pending = runs.get(request.runID)?.approvals.get(request.toolCallId)
      if (!pending) {
        // 审批已经不在等待中（运行结束/工具跑完，或回执投错了运行）。必须回话：
        // 渲染侧那一项可能还停在「待审批」，只留日志 = 用户点了按钮永远没反应。
        // 回一个失败事件让它收敛成错误，并提示重新发送
        log.warn('rejected tool-approval for unknown ticket', {
          runID: request.runID,
          toolCallId: request.toolCallId
        })
        sink.post({
          kind: 'tool-approval-failed',
          runID: request.runID,
          toolCallId: request.toolCallId,
          message: STALE_APPROVAL_MESSAGE
        })
        return
      }
      pending.ticket.settle(request.approved)
      return
    }
    if (runs.size >= MAX_CONCURRENT_RUNS) {
      sink.post({ kind: 'error', runID: request.runID, message: '并发运行数已达上限' })
      return
    }

    // 审批档位由引擎按 `request.host` 派生（不支持工具的模型走聊天档，其余按用户选择），
    // 这里只提供一次运行的状态容器
    const context: RunContext = {
      controller: new AbortController(),
      approvals: new Map()
    }
    runs.set(request.runID, context)
    void engine
      .run(request, sink, context)
      .finally(function () {
        // 引擎自己也会清票据（拿到回执就删）；这里兜住「运行结束时还挂着的那些」，
        // 它们会被结算成拒绝，不会留下悬着的 await
        context.approvals.forEach(function (pending) {
          pending.ticket.dispose()
        })
        context.approvals.clear()
        runs.delete(request.runID)
      })
      .catch(function (error: unknown) {
        // 可预期的失败引擎已经写进对话了；能走到这里的是没预料到的异常，
        // 兜一笔日志，别让它变成 unhandledRejection 悄悄消失
        log.warn('assistant run crashed', { runID: request.runID, error })
      })
  })

  function abortAll() {
    runs.forEach(function (context) {
      context.controller.abort()
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

export { connect, disposeEngine }
export type { Log }
