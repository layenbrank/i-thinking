/**
 * 共享 chat 层：领域类型 + 端口接口 + assistant-ui 适配器。
 *
 * 环境无关是硬约束：本包只能依赖 React / assistant-ui，不得引入 Node、Electron、`chrome.*`。
 * 两个 app 各自实现端口：
 * - `apps/studio`：历史走主进程 IPC（Drizzle），模型走 MessagePort（本地 provider）
 * - `apps/extension`：历史走 Dexie，模型走 apps/service 的 HTTPS 路由
 */

/** 会话（线程）元数据 */
interface ChatThread {
  id: string
  title: string
  pinned: boolean
  /** epoch ms */
  updatedAt: number
  providerID: string | null
  /** 归属的工作区（app 侧用它分组会话）；未绑定 / 区已删时为 null */
  workspaceID: string | null
}

/**
 * 一条消息的持久化行 —— assistant-ui 的存储契约，列名不可改名：
 * `{ id, parent_id, format, content }`（见 drizzle/schema/chat.ts）。
 * `content` 是该 `format` 对应适配器 encode 出的不透明字符串。
 */
interface ChatStoredMessage {
  id: string
  parentID: string | null
  format: string
  content: string
}

/** 历史端口：会话与消息的读写（studio / extension 各实现一份） */
interface ChatHistoryPort {
  /** 置顶优先、最近活动在前 */
  findThreads(): Promise<ChatThread[]>
  findThread(id: string): Promise<ChatThread | null>
  createThread(input?: {
    title?: string
    providerID?: string | null
    workspaceID?: string | null
  }): Promise<ChatThread>
  updateThread(
    id: string,
    patch: { title?: string; pinned?: boolean; workspaceID?: string | null }
  ): Promise<ChatThread>
  deleteThread(id: string): Promise<void>
  /** 按时间升序返回整条会话 */
  findMessages(input: { threadID: string }): Promise<ChatStoredMessage[]>
  appendMessage(input: { threadID: string } & ChatStoredMessage): Promise<void>
  updateMessage(input: { id: string; format?: string; content?: string }): Promise<void>
  /** 删除消息（含其后继分支，由实现方决定级联语义） */
  deleteMessages(input: { ids: string[] }): Promise<void>
}

/** 模型目标：由 app 注入（当前选中的 provider / 模型） */
interface ChatTarget {
  providerID: string
  model: string
}

/** 随用户消息发出的图片。data 是 data URL，共享层不解释像素 */
interface ChatImage {
  mediaType: string
  data: string
}

interface ChatRunMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  /**
   * 随消息一起发出的附件/引用名单（文件名或路径）。
   * 共享层只传递标签，怎么解释（工作区相对路径 / 上传文件 id）由 app 决定。
   * 图片不放这里：图片内容在 `images`。
   */
  attachments?: readonly string[]
  /** 只有用户消息会带。模型看不看得见由 app 在发送前决定 */
  images?: readonly ChatImage[]
}

interface ChatRunInput {
  system?: string
  messages: ChatRunMessage[]
  /**
   * 宿主侧扩展（工具集、审批策略、沙箱根…）。
   * 形状由各 app 自己定义与校验 —— 共享层只负责把它原样传给端口实现。
   */
  host?: Record<string, unknown>
}

interface ChatUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

/**
 * 模型流事件（纯数据，跨进程/跨网络都用这一套）。
 * `blockID` 用于把同一段文本（或同一段推理）的增量归组。
 */
type ChatStreamEvent =
  | { kind: 'text'; blockID: string; text: string }
  | { kind: 'reasoning'; blockID: string; text: string }
  | { kind: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
  | {
      kind: 'tool-approval-request'
      toolCallId: string
      toolName: string
      input: unknown
      /** 给用户看的一句话（工具自己给，缺失时由 UI 兜底） */
      prompt?: string
    }
  | {
      kind: 'tool-result'
      toolCallId: string
      toolName: string
      output: unknown
      isError?: boolean
    }
  | { kind: 'finish'; finishReason: string; usage: ChatUsage }
  | { kind: 'aborted' }
  | { kind: 'error'; message: string }

/** 工具审批回执（渲染进程 → 宿主）：由 UI 决定是否放行 */
interface ChatToolApproval {
  toolCallId: string
  approved: boolean
}

/** 模型端口：一次生成的事件流（实现方必须响应 `signal` 中止） */
interface ChatModelPort {
  /** 当前选中的 provider/模型；未配置时返回 null，由适配器抛可展示的错误。异步：配置来自 IPC/Dexie */
  findTarget(): Promise<ChatTarget | null>
  run(input: ChatRunInput & ChatTarget, signal: AbortSignal): AsyncIterable<ChatStreamEvent>
  /**
   * 回答一次工具审批（事件流里出现过 `tool-approval-request`）。
   * 实现方须把它转到当前运行；无进行中的运行时为 no-op。
   */
  respondToApproval?(input: ChatToolApproval): void
}

/** 给联合类型每个成员补上字段（分发式条件类型） */
type WithRunID<T> = T extends unknown ? T & { runID: string } : never

/**
 * MessagePort 传输的请求（渲染进程 → 主进程）。
 * 只有 Electron 通路用这套信封；extension 走 HTTPS + AI SDK 数据流，不涉及。
 */
type ChatPortRequest =
  | ({ kind: 'start'; runID: string } & ChatTarget & ChatRunInput)
  | { kind: 'abort'; runID: string }
  | ({ kind: 'tool-approval'; runID: string } & ChatToolApproval)

/**
 * MessagePort 传输的事件（主进程 → 渲染进程）：共享事件形状 + 运行 id。
 * 一个端口上可能同时跑多个运行，用 `runID` 区分。
 */
type ChatPortEvent = WithRunID<ChatStreamEvent>

export type {
  ChatHistoryPort,
  ChatImage,
  ChatModelPort,
  ChatPortEvent,
  ChatPortRequest,
  ChatRunInput,
  ChatRunMessage,
  ChatStoredMessage,
  ChatStreamEvent,
  ChatTarget,
  ChatThread,
  ChatToolApproval,
  ChatUsage
}
