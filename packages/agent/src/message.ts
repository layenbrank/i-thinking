/**
 * 消息与内容块。opencode 用 `parts` 而非单一 `content` 字符串，
 * 一个消息可混装文本/图片/文件/推理/工具。对齐 opencode v2 `/build/sdk/` 与 ACP 的 ContentBlock。
 */

type Role = 'system' | 'user' | 'assistant'

interface TextPart {
  type: 'text'
  text: string
}

interface ImagePart {
  type: 'image'
  /** 远程 URL 与 data URL 二选一 */
  url?: string
  mediaType?: string
  data?: string
}

interface FilePart {
  type: 'file'
  /** 相对路径 / 上传文件 id / URL，解释权归宿主 */
  url?: string
  name?: string
  mediaType?: string
  data?: string
}

interface ReasoningPart {
  type: 'reasoning'
  text: string
  /** 部分供应商要求回传的签名（如 Anthropic extended thinking） */
  signature?: string
}

/** 工具调用/结果作为消息 part（多轮 agent 循环里重放上下文用） */
interface ToolPart {
  type: 'tool'
  toolCallId: string
  toolName: string
  state: 'pending' | 'running' | 'requires-action' | 'complete' | 'error'
  input?: unknown
  output?: unknown
}

type Part = TextPart | ImagePart | FilePart | ReasoningPart | ToolPart

interface Message {
  id: string
  role: Role
  parts: Part[]
  /** epoch ms */
  createdAt?: number
}

export type { FilePart, ImagePart, Message, Part, ReasoningPart, Role, TextPart, ToolPart }
