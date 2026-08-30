/**
 * Provider 注册表：接入类型的元数据与默认值
 */
import type { ProviderKind } from '@/stores/provider'

interface ProviderKindMeta {
  label: string
  defaultBaseUrl: string
  needsApiKey: boolean
  models: string[]
}

const OLLAMA_BASE_URL = 'http://localhost:11434'

const PROVIDER_KIND_META: Record<ProviderKind, ProviderKindMeta> = {
  openai: {
    label: 'OpenAI 兼容',
    defaultBaseUrl: 'https://api.openai.com/v1',
    needsApiKey: true,
    models: ['gpt-4o', 'gpt-4o-mini']
  },
  ollama: {
    label: 'Ollama 本地',
    defaultBaseUrl: OLLAMA_BASE_URL,
    needsApiKey: false,
    models: ['qwen3:8b']
  }
}

const COMMON_BASE_URLS: { label: string; baseUrl: string }[] = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { label: 'Moonshot', baseUrl: 'https://api.moonshot.cn/v1' },
  { label: '智谱', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' }
]

function parseModels(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function stringifyModels(models: string[]): string {
  return JSON.stringify(models)
}

export { PROVIDER_KIND_META, COMMON_BASE_URLS, OLLAMA_BASE_URL, parseModels, stringifyModels }
export type { ProviderKindMeta }
