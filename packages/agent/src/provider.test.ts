import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MODEL_CAPABILITIES,
  DEFAULT_MODEL_LIMIT,
  findCredentialKind,
  findModelCapabilities,
  findModelLimit,
  findProviderSource,
  GATEWAY_PROVIDER_KIND,
  normalizeModelEntries,
  PROVIDER_PRESETS,
  requiresApiKey,
  supportsTools,
  toModel,
  toModelEntry
} from './provider'

describe('findProviderSource / findCredentialKind', function () {
  it('只有网关是平台来源，凭据是登录令牌', function () {
    expect(findProviderSource(GATEWAY_PROVIDER_KIND)).toBe('platform')
    expect(findCredentialKind(GATEWAY_PROVIDER_KIND)).toBe('platform-token')

    for (const preset of PROVIDER_PRESETS) {
      expect(findProviderSource(preset.kind)).toBe('local')
      expect(findCredentialKind(preset.kind)).toBe('api-key')
    }
  })

  it('未知 kind 按本机 BYOK 处理', function () {
    expect(findProviderSource('whatever')).toBe('local')
    expect(findCredentialKind('whatever')).toBe('api-key')
  })
})

describe('requiresApiKey', function () {
  it('只有本机模型服务与自建兼容端点不强制要 Key', function () {
    expect(requiresApiKey('ollama')).toBe(false)
    expect(requiresApiKey('lm-studio')).toBe(false)
    expect(requiresApiKey('openai-compatible')).toBe(false)
  })

  it('云端预设一律要 Key', function () {
    const keyless = new Set(['ollama', 'lm-studio', 'openai-compatible'])
    for (const preset of PROVIDER_PRESETS) {
      if (keyless.has(preset.kind)) continue
      expect(requiresApiKey(preset.kind)).toBe(true)
    }
    expect(requiresApiKey(GATEWAY_PROVIDER_KIND)).toBe(true)
  })

  it('未知 kind 按要 Key 处理', function () {
    expect(requiresApiKey('some-cloud')).toBe(true)
  })
})

describe('normalizeModelEntries', function () {
  it('吃得下旧数据的纯字符串清单', function () {
    expect(normalizeModelEntries(['gpt-4o', ' gpt-4o-mini ', { id: 'o3' }])).toEqual([
      { id: 'gpt-4o' },
      { id: 'gpt-4o-mini' },
      { id: 'o3' }
    ])
  })

  it('丢弃空 id 与非数组输入，并按 id 去重保序', function () {
    expect(
      normalizeModelEntries(['a', 'a', '', '  ', 42, null, { name: 'x' }, { id: ' b ' }])
    ).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(normalizeModelEntries(null)).toEqual([])
    expect(normalizeModelEntries({ id: 'a' })).toEqual([])
  })

  it('保留已声明的能力与上限，剔除非法的', function () {
    expect(
      normalizeModelEntries([
        {
          id: 'gpt-4o',
          name: ' GPT-4o ',
          capabilities: { tools: true, vision: true, reasoning: 'yes' },
          limit: { context: 128000, output: -1 }
        }
      ])
    ).toEqual([
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        capabilities: { tools: true, vision: true },
        limit: { context: 128000 }
      }
    ])
  })

  it('保留上游供应商展示名（服务端目录才有），空串视为未声明', function () {
    expect(
      normalizeModelEntries([
        { id: 'gpt-4o', providerName: ' OpenAI ' },
        { id: 'o3', providerName: '' }
      ])
    ).toEqual([{ id: 'gpt-4o', providerName: 'OpenAI' }, { id: 'o3' }])
  })
})

describe('toModel', function () {
  it('补默认：展示名用 id，能力/上限都用兜底', function () {
    expect(toModel({ id: 'gpt-4o' })).toEqual({
      id: 'gpt-4o',
      name: 'gpt-4o',
      capabilities: DEFAULT_MODEL_CAPABILITIES,
      limit: DEFAULT_MODEL_LIMIT
    })
  })

  it('只覆盖声明过的字段', function () {
    const model = toModel({
      id: 'qwen3',
      name: 'Qwen3',
      capabilities: { tools: true },
      limit: { context: 262144 }
    })

    expect(model.name).toBe('Qwen3')
    expect(model.capabilities).toEqual({ tools: true, reasoning: false, vision: false })
    expect(model.limit).toEqual({ context: 262144, output: DEFAULT_MODEL_LIMIT.output })
  })
})

describe('能力门禁', function () {
  it('未声明 tools 的模型按可用处理，显式 false 才关掉', function () {
    expect(supportsTools({ id: 'legacy-row' })).toBe(true)
    expect(supportsTools({ id: 'chat-only', capabilities: { tools: false } })).toBe(false)
    expect(supportsTools({ id: 'agent-capable', capabilities: { tools: true } })).toBe(true)
  })

  it('findModelCapabilities / findModelLimit 不改动入参', function () {
    const entry = { id: 'a', capabilities: { tools: true }, limit: { context: 1000 } }
    expect(findModelCapabilities(entry).reasoning).toBe(false)
    expect(findModelLimit(entry).output).toBe(DEFAULT_MODEL_LIMIT.output)
    expect(entry).toEqual({ id: 'a', capabilities: { tools: true }, limit: { context: 1000 } })
  })
})

describe('toModelEntry', function () {
  it('拒绝非对象、无 id、数组', function () {
    expect(toModelEntry(undefined)).toBeNull()
    expect(toModelEntry('')).toBeNull()
    expect(toModelEntry([])).toBeNull()
    expect(toModelEntry({ id: 1 })).toBeNull()
  })
})
