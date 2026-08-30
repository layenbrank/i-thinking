/**
 * Agent 领域类型：对话消息、归一化流块、结构化消息部件、工具协议
 */

type ChatIdentity = 'system' | 'user' | 'assistant' | 'tool'

interface ChatToolFunction {
  name: string
  arguments: string
}

interface ChatToolCall {
  id: string
  type: 'function'
  function: ChatToolFunction
}

interface ChatMessage {
  role: ChatIdentity
  content: string | null
  thinking?: string
  tool_calls?: ChatToolCall[]
  tool_call_id?: string
  name?: string
}

/** 流式 tool_call 增量（按 index 拼接） */
interface ToolCallDelta {
  index: number
  id?: string
  name?: string
  arguments?: string
}

/** 各 provider 流式输出归一化后的增量块 */
interface NormalizedChunk {
  content?: string
  thinking?: string
  toolCalls?: ToolCallDelta[]
  finishReason?: string | null
  done?: boolean
}

interface AgentToolParameters {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
}

interface AgentToolFunctionDef {
  name: string
  description: string
  parameters: AgentToolParameters
}

/** OpenAI / Ollama 兼容的 tools 定义 */
interface AgentToolDefinition {
  type: 'function'
  function: AgentToolFunctionDef
}

interface ToolCallRequest {
  id: string
  name: string
  arguments: string
}

interface ToolCallResult {
  toolCallId: string
  name: string
  content: string
  isError?: boolean
}

/** 运行时解析后的模型接入配置（apiKey 已从 plugin-store 合并） */
interface ProviderConfig {
  id: string
  kind: 'openai' | 'ollama'
  name: string
  baseUrl: string
  model: string
  apiKey?: string
}

interface FilePartData {
  path: string
  name: string
  size?: number
  summary?: string
}

interface CompareItemData {
  name: string
  price?: string
  values: Record<string, string>
  verdict?: string
}

interface ComparePartData {
  title?: string
  attributes: string[]
  items: CompareItemData[]
}

interface PlanItemData {
  time?: string
  title: string
  done?: boolean
}

interface PlanPartData {
  date?: string
  items: PlanItemData[]
}

interface DiffPartData {
  path: string
  before?: string
  after: string
  applied?: boolean
}

interface ToolPartData {
  toolCallId: string
  name: string
  arguments?: string
  result?: string
  status: 'running' | 'done' | 'error'
}

interface FilePart {
  type: 'file'
  data: FilePartData
}

interface ComparePart {
  type: 'compare'
  data: ComparePartData
}

interface PlanPart {
  type: 'plan'
  data: PlanPartData
}

interface DiffPart {
  type: 'diff'
  data: DiffPartData
}

interface ToolPart {
  type: 'tool'
  data: ToolPartData
}

type MessagePart = FilePart | ComparePart | PlanPart | DiffPart | ToolPart

type MessagePartType = MessagePart['type']

/** 输入区的场景模式：决定 prompt 包装与产出部件解析 */
type Scenario = 'compare' | 'plan' | 'code' | 'image'

export type {
  ChatIdentity,
  ChatMessage,
  ChatToolCall,
  ChatToolFunction,
  ToolCallDelta,
  NormalizedChunk,
  AgentToolDefinition,
  AgentToolFunctionDef,
  AgentToolParameters,
  ToolCallRequest,
  ToolCallResult,
  ProviderConfig,
  MessagePart,
  MessagePartType,
  Scenario,
  FilePart,
  FilePartData,
  ComparePart,
  ComparePartData,
  CompareItemData,
  PlanPart,
  PlanPartData,
  PlanItemData,
  DiffPart,
  DiffPartData,
  ToolPart,
  ToolPartData
}
