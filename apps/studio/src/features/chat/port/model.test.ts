import { describe, expect, it } from 'vitest'

import { findSelectedProvider, findUsableProviders, resolveTarget } from './model'

type ProviderRow = Parameters<typeof findUsableProviders>[0][number]

function buildProvider(overrides: Partial<ProviderRow> & { id: string }): ProviderRow {
  return {
    kind: 'ollama',
    name: overrides.id,
    baseUrl: 'http://127.0.0.1:11434',
    models: null,
    model: 'qwen3:8b',
    enabled: true,
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z',
    ...overrides
  }
}

describe('findUsableProviders', function () {
  it('只保留启用且有模型的 provider', function () {
    const providers = [
      buildProvider({ id: 'a' }),
      buildProvider({ id: 'b', enabled: false }),
      buildProvider({ id: 'c', model: '', models: [] })
    ]

    expect(
      findUsableProviders(providers).map(function (provider) {
        return provider.id
      })
    ).toEqual(['a'])
  })

  it('没有默认模型但有模型列表也算可用', function () {
    const providers = [buildProvider({ id: 'a', model: '', models: ['qwen3:8b'] })]

    expect(findUsableProviders(providers)).toHaveLength(1)
  })
})

describe('findSelectedProvider', function () {
  const providers = [buildProvider({ id: 'a' }), buildProvider({ id: 'b' })]

  it('显式选择优先', function () {
    const picked = findSelectedProvider(providers, { providerID: 'b', model: '' })

    expect(picked?.id).toBe('b')
  })

  it('未选择时取第一个可用的', function () {
    const picked = findSelectedProvider(providers, { providerID: null, model: '' })

    expect(picked?.id).toBe('a')
  })

  it('选中的 provider 不可用时回落', function () {
    const picked = findSelectedProvider(providers, { providerID: 'gone', model: '' })

    expect(picked?.id).toBe('a')
  })
})

describe('resolveTarget', function () {
  const providers = [buildProvider({ id: 'a', model: 'qwen3:8b', models: ['qwen3:14b'] })]

  it('设置里的模型覆盖优先', function () {
    expect(resolveTarget(providers, { providerID: null, model: 'qwen3:14b' })).toEqual({
      providerID: 'a',
      model: 'qwen3:14b'
    })
  })

  it('未选模型时用 provider 默认', function () {
    expect(resolveTarget(providers, { providerID: null, model: '  ' })).toEqual({
      providerID: 'a',
      model: 'qwen3:8b'
    })
  })

  it('没有可用 provider 时返回 null', function () {
    expect(resolveTarget([], { providerID: null, model: '' })).toBeNull()
  })
})
