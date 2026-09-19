/**
 * Agent 定义与句柄。
 *
 * P1 用 Effect 落地运行时：`AgentHandle.prompt` 产出 `SessionUpdate` 增量流，
 * `respondToPermission` 回答工具审批。Agent 定义（system/model/tools/permissions/skills）
 * 是纯数据，可跨进程/跨网络序列化。
 */

import type { SessionUpdate } from './events'
import type { Message } from './message'
import type { PermissionMode, PermissionReply } from './permission'
import type { ModelID } from './provider'
import type { Attachment, Skill } from './skill'
import type { Tool } from './tool'

interface AgentDefinition {
  name: string
  description?: string
  /** 系统提示词 */
  system?: string
  /** 默认模型（可被会话覆盖） */
  model?: ModelID
  tools: Record<string, Tool>
  permission?: PermissionMode
  skills?: Skill[]
}

/** 一次 prompt 的输入：历史消息 + 可选覆盖 + 附件 */
interface PromptInput {
  messages: Message[]
  system?: string
  model?: ModelID
  attachments?: Attachment[]
}

interface SessionState {
  sessionId: string
  /** 工作区 cwd（MCP server 与工具沙箱根） */
  cwd: string
  messages: Message[]
}

/**
 * 一次运行的句柄。P1 起 `prompt` 改为 Effect 版（`Effect<Stream<SessionUpdate>>`），
 * 此处先以 `AsyncIterable` 定型。
 */
interface AgentHandle {
  prompt(input: PromptInput, signal?: AbortSignal): AsyncIterable<SessionUpdate>
  /** 回答一次工具审批；无进行中的运行时为 no-op */
  respondToPermission(reply: PermissionReply): void
}

export type { AgentDefinition, AgentHandle, PromptInput, SessionState }
