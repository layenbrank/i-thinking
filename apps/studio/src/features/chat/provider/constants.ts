/**
 * provider 表单常量。
 *
 * 三种类型都是 OpenAI 兼容端点，区别只是默认地址与命名（便于用户认）；
 * 真正发请求的是主进程的 `@ai-sdk/openai-compatible`。
 *
 * 地址必须是 **OpenAI 兼容根路径**（含 `/v1`）：AI SDK 自己接 `/chat/completions`。
 * 取值照官方文档：Ollama `http://localhost:11434/v1/`（API Key 必填但会被忽略）、
 * LM Studio `http://localhost:1234/v1`。
 */

const PROVIDER_KINDS = [
  { value: 'ollama', label: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
  { value: 'lm-studio', label: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' },
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
