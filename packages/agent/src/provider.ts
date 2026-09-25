/**
 * 在线模型供应商与模型目录。
 *
 * 对齐 opencode v2 `/providers/`：模型以 `provider/model` 引用；供应商抽象出
 * 端点、密钥与请求头，云端（BYOK）与本地（Ollama）同形状。
 *
 * `apiKey` 不进 Provider 持久化——它由注入的 SecretStore（safeStorage / keyring）
 * 按 providerID 读写，运行时再拼回，保证密钥不出域。
 */

/** 模型全名 `provider/model`，如 `anthropic/claude-sonnet-4-5`、`ollama/qwen3:8b` */
type ModelID = string

/** 供应商标识：内置 preset + 通用兜底 + 平台网关（本仓库 service 的 AI 网关，模型由服务端目录下发） */
type ProviderKind =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'qwen'
  | 'zhipu'
  | 'ollama'
  | 'lm-studio'
  | 'openai-compatible'
  | 'gateway'

/**
 * 供应商标识里的平台网关 kind。
 *
 * 网关是**一个** OpenAI 兼容端点（`{服务地址}/gateway`），它背后挂什么供应商由服务端
 * 目录决定；所以它在客户端只占一行 provider，`models` 是服务端下发的声明式清单。
 */
const GATEWAY_PROVIDER_KIND = 'gateway'

/**
 * 供应商来源：决定**凭据从哪来**，是客户端唯一的凭据分派轴。
 *
 * - `local`：本机 BYOK，密钥在 OS 钥匙串（safeStorage），按 providerID 取；
 * - `platform`：平台网关，凭据是当前登录令牌（不进钥匙串），端点由服务端下发。
 */
type ProviderSource = 'local' | 'platform'

const PROVIDER_SOURCE_LABELS: Record<ProviderSource, string> = {
  local: '我的模型',
  platform: '组织模型'
}

/** 来源由 kind 派生：只有网关是平台来源，其余都是本机 BYOK */
function findProviderSource(kind: string): ProviderSource {
  return kind === GATEWAY_PROVIDER_KIND ? 'platform' : 'local'
}

/** 凭据类型由来源派生（客户端不存凭据，只按类型去取） */
type CredentialKind = 'api-key' | 'platform-token'

function findCredentialKind(kind: string): CredentialKind {
  return findProviderSource(kind) === 'platform' ? 'platform-token' : 'api-key'
}

/**
 * 不需要 apiKey 就能用的 kind：本机模型服务（Ollama / LM Studio）与自建 OpenAI 兼容端点
 * 都不校验密钥。
 *
 * 为什么必须显式列出来：其余 kind 都是云端预设，没密钥发过去只会拿到上游的 401 ——
 * 更糟的情况是服务端在把它装配成请求时要读一个不存在的 provider 字段，回一句谁也看不懂的
 * TypeError。所以「有没有密钥」是判定**这个 provider 到底能不能用**的门槛，而不是可有可无的
 * 装饰。表以外的 kind 一律按需要密钥处理（未知来源宁可挡住也不发一个注定失败的上游请求）。
 */
const KEYLESS_PROVIDER_KINDS: Readonly<Record<string, true>> = {
  ollama: true,
  'lm-studio': true,
  'openai-compatible': true
}

/** 这个 kind 的 provider 必须配了 apiKey 才可用（见 `KEYLESS_PROVIDER_KINDS`） */
function requiresApiKey(kind: string): boolean {
  return KEYLESS_PROVIDER_KINDS[kind] !== true
}

interface ModelLimit {
  /** 上下文窗口（token） */
  context: number
  /** 单次输出上限（token） */
  output: number
}

interface ModelCapabilities {
  /** 支持工具调用（函数调用） */
  tools: boolean
  /** 支持推理（thinking）增量 */
  reasoning?: boolean
  /** 支持图片输入 */
  vision?: boolean
}

/**
 * 能力兜底：**未声明按「能用」处理，显式声明 false 才关闭**。
 *
 * 为什么不是「未知即不支持」：`tools` 一直随请求发送（主进程从不看能力），本地老的
 * provider 行里只存了模型名、没有任何声明；把未知降级成不支持会让这些用户**当场失去工具**。
 * 逆向的代价只是「上游可能报一次错」，而且报错是可读的。声明来源仍然是那两个：
 * 服务端目录（网关）/ 用户手填（BYOK）。
 *
 * `reasoning` / `vision` 相反，默认 false：猜错的话 UI 会诱导用户点一个不存在的功能，
 * 且无法在请求里纠正。
 */
const DEFAULT_MODEL_CAPABILITIES: ModelCapabilities = {
  tools: true,
  reasoning: false,
  vision: false
}

/** 上限兜底：未声明时按保守值（同 Copilot 的未知模型默认） */
const DEFAULT_MODEL_LIMIT: ModelLimit = { context: 128_000, output: 8_192 }

/** 归一后的模型：各项都有值，可直接喂给 UI 与发送链路 */
interface Model {
  id: string
  /** 展示名 */
  name: string
  limit: ModelLimit
  capabilities: ModelCapabilities
}

/**
 * 声明态模型：`models` 列 / 服务端目录里的形状。
 *
 * 与 `Model` 的差别只在于「可缺」——落库与服务端契约要能表达「只知道 id」。
 * 读的时候一律经 `toModel()` 补默认，写的时候只落用户/服务端真的声明过的字段。
 */
interface ModelEntry {
  id: string
  name?: string
  /**
   * 上游供应商展示名（服务端目录下发，如「OpenAI」）。
   *
   * 只在模型来自服务端目录时有值：用户自己配的 provider 里，供应商就是这一行本身，
   * 再说一遍是噪音。给组织模型用 —— 用户看不到上游供应商表（那是后台接口）。
   */
  providerName?: string
  capabilities?: Partial<ModelCapabilities>
  limit?: Partial<ModelLimit>
}

/** 从任意来源（含旧数据的纯字符串）读一条声明；读不出 id 就丢弃 */
function toModelEntry(raw: unknown): ModelEntry | null {
  if (typeof raw === 'string') {
    const id = raw.trim()
    return id ? { id } : null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const row = raw as {
    id?: unknown
    name?: unknown
    providerName?: unknown
    capabilities?: unknown
    limit?: unknown
  }
  if (typeof row.id !== 'string' || !row.id.trim()) return null

  const entry: ModelEntry = { id: row.id.trim() }
  if (typeof row.name === 'string' && row.name.trim()) entry.name = row.name.trim()
  if (typeof row.providerName === 'string' && row.providerName.trim()) {
    entry.providerName = row.providerName.trim()
  }

  const capabilities = toCapabilities(row.capabilities)
  if (capabilities) entry.capabilities = capabilities

  const limit = toLimit(row.limit)
  if (limit) entry.limit = limit

  return entry
}

function toCapabilities(raw: unknown): Partial<ModelCapabilities> | null {
  if (!raw || typeof raw !== 'object') return null

  const row = raw as { tools?: unknown; reasoning?: unknown; vision?: unknown }
  const capabilities: Partial<ModelCapabilities> = {}
  if (typeof row.tools === 'boolean') capabilities.tools = row.tools
  if (typeof row.reasoning === 'boolean') capabilities.reasoning = row.reasoning
  if (typeof row.vision === 'boolean') capabilities.vision = row.vision

  return Object.keys(capabilities).length > 0 ? capabilities : null
}

function toLimit(raw: unknown): Partial<ModelLimit> | null {
  if (!raw || typeof raw !== 'object') return null

  const row = raw as { context?: unknown; output?: unknown }
  const limit: Partial<ModelLimit> = {}
  if (isPositiveNumber(row.context)) limit.context = Math.round(row.context)
  if (isPositiveNumber(row.output)) limit.output = Math.round(row.output)

  return Object.keys(limit).length > 0 ? limit : null
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** 任意来源的模型清单 → 声明态清单（去重、保序；旧数据的 `string[]` 照样吃得下） */
function normalizeModelEntries(raw: unknown): ModelEntry[] {
  if (!Array.isArray(raw)) return []

  const entries: ModelEntry[] = []
  for (const item of raw) {
    const entry = toModelEntry(item)
    if (!entry) continue
    if (
      entries.some(function (seen) {
        return seen.id === entry.id
      })
    )
      continue
    entries.push(entry)
  }
  return entries
}

function findModelCapabilities(entry: ModelEntry): ModelCapabilities {
  return { ...DEFAULT_MODEL_CAPABILITIES, ...entry.capabilities }
}

function findModelLimit(entry: ModelEntry): ModelLimit {
  return { ...DEFAULT_MODEL_LIMIT, ...entry.limit }
}

/** 归一为完整模型：展示名缺省用 id，能力与上限缺省用兜底 */
function toModel(entry: ModelEntry): Model {
  return {
    id: entry.id,
    name: entry.name || entry.id,
    limit: findModelLimit(entry),
    capabilities: findModelCapabilities(entry)
  }
}

/** 能力门禁：不支持工具调用的模型不进 agent 工具链（只当聊天模型用） */
function supportsTools(entry: ModelEntry): boolean {
  return findModelCapabilities(entry).tools
}

/** 供应商配置；apiKey 由 SecretStore 按 providerID 读写，不落此结构 */
interface Provider {
  id: string
  kind: ProviderKind
  name: string
  /** OpenAI 兼容根路径（含 /v1）；平台网关是 `{服务地址}/gateway` */
  baseUrl: string
  /** 默认模型 */
  model: string
  /** 可选模型清单（不含默认）；声明态，能力/上限可缺 */
  models: ModelEntry[]
  /** 额外请求头（如 Anthropic 的 `anthropic-version`） */
  headers?: Record<string, string>
  enabled: boolean
}

/** 供应商预设：地址、展示名，以及这一家开箱可用的常用模型 */
interface ProviderPreset {
  kind: ProviderKind
  name: string
  baseUrl: string
  /**
   * **预填清单，不是白名单**：厂商上下架模型比发版快，用户填了表外的名字也照发，
   * 到底能不能用由上游回答。它只解决「选完厂商还得去官网抄模型名」这件事。
   * 本地运行时没有公开清单，留空由用户自己填。
   *
   * 清单已按各厂商官方文档核对过一轮（OpenAI 取官方 SDK 的模型联合类型，其余取厂商定价/模型页），
   * 旧名字会随着厂商下线而失效：改这一列必须同步 `preset.test.ts` 与
   * `docs/apps/studio/online-models.md`。
   */
  models: readonly string[]
}

/**
 * 内置云/本地供应商 preset：baseUrl 取官方端点，密钥由用户提供。
 * 端点可能随厂商调整，落地 P1 时对照 opencode v2 `/providers/` 复核一遍。
 *
 * 这份表是**客户端预设的唯一真源**：studio 的 provider 表单直接用它渲染选项与预填值，
 * 不再自己维护一份 kinds 常量（曾经两边不一致，加一家要改两处）。
 */
const PROVIDER_PRESETS: ReadonlyArray<ProviderPreset> = [
  {
    kind: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5.6', 'gpt-5.5-pro', 'gpt-5.4-mini']
  },
  {
    kind: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    // deepseek-flash 即 DeepSeek-V4.1-Flash；deepseek-v4-flash / deepseek-v4-flash-vision-exp
    // 是已下线的旧模型名（仍接受，但请求由 V4.1-Flash 接），deepseek-chat / deepseek-reasoner 已退市
    models: ['deepseek-flash', 'deepseek-v4-pro']
  },
  {
    kind: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.8-flash', 'qwen3.7-flash']
  },
  {
    kind: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-5.3', 'glm-5.3-flash', 'glm-5.2']
  },
  { kind: 'ollama', name: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1', models: [] },
  { kind: 'lm-studio', name: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1', models: [] },
  { kind: 'openai-compatible', name: 'OpenAI 兼容（自定义）', baseUrl: '', models: [] }
]

/** Anthropic 走原生协议，主进程只发 OpenAI 兼容请求，先不放进可选预设（对齐 service 的放行表） */
const UNSUPPORTED_PROVIDER_PRESETS: ReadonlyArray<Pick<Provider, 'kind' | 'name' | 'baseUrl'>> = [
  { kind: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' }
]

const PROVIDER_KIND_LABELS: Record<string, string> = Object.fromEntries(
  [...PROVIDER_PRESETS, ...UNSUPPORTED_PROVIDER_PRESETS].map(function (preset) {
    return [preset.kind, preset.name]
  })
)

export {
  DEFAULT_MODEL_CAPABILITIES,
  DEFAULT_MODEL_LIMIT,
  findCredentialKind,
  findModelCapabilities,
  findModelLimit,
  findProviderSource,
  GATEWAY_PROVIDER_KIND,
  normalizeModelEntries,
  PROVIDER_KIND_LABELS,
  PROVIDER_PRESETS,
  PROVIDER_SOURCE_LABELS,
  requiresApiKey,
  supportsTools,
  toModel,
  toModelEntry
}
export type {
  CredentialKind,
  Model,
  ModelCapabilities,
  ModelEntry,
  ModelID,
  ModelLimit,
  Provider,
  ProviderKind,
  ProviderPreset,
  ProviderSource
}
