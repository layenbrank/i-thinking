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

/** 供应商标识：内置 preset + 通用兜底 */
type ProviderKind =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'qwen'
  | 'zhipu'
  | 'ollama'
  | 'lm-studio'
  | 'openai-compatible'

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

interface Model {
  id: string
  /** 展示名 */
  name: string
  limit: ModelLimit
  capabilities?: ModelCapabilities
}

/** 供应商配置；apiKey 由 SecretStore 按 providerID 读写，不落此结构 */
interface Provider {
  id: string
  kind: ProviderKind
  name: string
  /** OpenAI 兼容根路径（含 /v1）；Anthropic 用原生端点根 */
  baseUrl: string
  /** 默认模型 */
  model: string
  /** 可选模型清单（不含默认） */
  models: string[]
  /** 额外请求头（如 Anthropic 的 `anthropic-version`） */
  headers?: Record<string, string>
  enabled: boolean
}

/**
 * 内置云/本地供应商 preset：baseUrl 取官方端点，密钥由用户提供。
 * 端点可能随厂商调整，落地 P1 时对照 opencode v2 `/providers/` 复核一遍。
 */
const PROVIDER_PRESETS: ReadonlyArray<Pick<Provider, 'kind' | 'name' | 'baseUrl'>> = [
  { kind: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { kind: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  { kind: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { kind: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { kind: 'zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { kind: 'ollama', name: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
  { kind: 'lm-studio', name: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' }
]

const PROVIDER_KIND_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDER_PRESETS.map(function (preset) {
    return [preset.kind, preset.name]
  })
)

export { PROVIDER_KIND_LABELS, PROVIDER_PRESETS }
export type { Model, ModelCapabilities, ModelID, ModelLimit, Provider, ProviderKind }
