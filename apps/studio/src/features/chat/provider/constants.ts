/**
 * provider 表单常量。
 *
 * 全部走 OpenAI 兼容端点（主进程 `@ai-sdk/openai-compatible`）：
 * - 本地：Ollama / LM Studio
 * - BYOK 云：OpenAI / DeepSeek / 通义 / 智谱（密钥落主进程 safeStorage）
 * - 兜底：任意兼容根路径
 *
 * 地址必须是 **OpenAI 兼容根路径**（含 `/v1`）：AI SDK 自己接 `/chat/completions`。
 * Anthropic 原生协议不在此列（需单独 client，见 packages/agent）。
 *
 * kind / baseUrl 与 packages/agent `PROVIDER_PRESETS` 对齐（同名同址）。
 */

const PROVIDER_KINDS = [
  { value: 'ollama', label: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
  { value: 'lm-studio', label: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' },
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  {
    value: 'qwen',
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  { value: 'zhipu', label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { value: 'openai-compatible', label: 'OpenAI 兼容', baseUrl: '' }
] as const

/** kind → 展示名（表驱动，避免散落的 if/switch） */
const PROVIDER_KIND_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDER_KINDS.map(function (kind) {
    return [kind.value, kind.label]
  })
)

const PROVIDER_FORM_DEFAULTS = {
  kind: PROVIDER_KINDS[0].value as string,
  name: '',
  baseUrl: PROVIDER_KINDS[0].baseUrl as string,
  model: '',
  models: '',
  apiKey: '',
  enabled: true
}

export { PROVIDER_KINDS, PROVIDER_KIND_LABELS, PROVIDER_FORM_DEFAULTS }
