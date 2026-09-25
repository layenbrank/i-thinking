import { describe, expect, it } from 'vitest'

import { PROVIDER_KINDS } from './constants'
import { PROVIDER_FORM_DEFAULTS } from './preset'
import { toModelEntries, toModelIDs, PROVIDER_SCHEMA } from './schema'

function validValues() {
  return { ...PROVIDER_FORM_DEFAULTS, name: '本地 Ollama', model: 'qwen3:8b' }
}

describe('PROVIDER_SCHEMA', function () {
  it('接受默认值 + 必填项', function () {
    expect(PROVIDER_SCHEMA.safeParse(validValues()).success).toBe(true)
  })

  it('名称与默认模型必填', function () {
    expect(PROVIDER_SCHEMA.safeParse({ ...validValues(), name: '' }).success).toBe(false)
    expect(PROVIDER_SCHEMA.safeParse({ ...validValues(), model: '' }).success).toBe(false)
  })

  it('地址允许留空，但填了就必须是合法 URL', function () {
    expect(PROVIDER_SCHEMA.safeParse({ ...validValues(), baseUrl: '' }).success).toBe(true)
    expect(
      PROVIDER_SCHEMA.safeParse({ ...validValues(), baseUrl: '127.0.0.1:11434' }).success
    ).toBe(false)
    expect(
      PROVIDER_SCHEMA.safeParse({ ...validValues(), baseUrl: 'http://127.0.0.1:11434' }).success
    ).toBe(true)
  })

  it('apiKey 可留空（本地服务通常不需要）', function () {
    expect(PROVIDER_SCHEMA.safeParse({ ...validValues(), apiKey: '' }).success).toBe(true)
    expect(PROVIDER_SCHEMA.safeParse({ ...validValues(), apiKey: 'sk-1' }).success).toBe(true)
  })

  it('可选用模型只收模型名，数量有上限', function () {
    expect(PROVIDER_SCHEMA.safeParse({ ...validValues(), models: ['a', 'b'] }).success).toBe(true)
    expect(PROVIDER_SCHEMA.safeParse({ ...validValues(), models: [''] }).success).toBe(false)
    expect(
      PROVIDER_SCHEMA.safeParse({
        ...validValues(),
        models: Array.from({ length: 65 }, function (_item, index) {
          return `m-${index}`
        })
      }).success
    ).toBe(false)
  })
})

describe('models 模型名与条目互转', function () {
  it('模型名清单 → 条目（顺手去掉首尾空格）；空清单 → null', function () {
    expect(toModelEntries(['qwen3:8b', ' llama3.2:3b '], null)).toEqual([
      { id: 'qwen3:8b' },
      { id: 'llama3.2:3b' }
    ])
    expect(toModelEntries([], null)).toBeNull()
    expect(toModelEntries(['  '], null)).toBeNull()
  })

  it('原有条目按 id 复用，保留已声明的能力与上限', function () {
    const existing = [
      { id: 'qwen3:8b', name: 'Qwen3 8B', capabilities: { tools: true }, limit: { context: 32768 } }
    ]

    expect(toModelEntries(['qwen3:8b', 'qwen3:14b'], existing)).toEqual([
      existing[0],
      { id: 'qwen3:14b' }
    ])
    expect(toModelEntries(['qwen3:14b'], existing)).toEqual([{ id: 'qwen3:14b' }])
  })

  it('条目 → 模型名可往返', function () {
    expect(toModelEntries(toModelIDs([{ id: 'a' }, { id: 'b' }]), null)).toEqual([
      { id: 'a' },
      { id: 'b' }
    ])
    expect(toModelIDs(null)).toEqual([])
  })
})

describe('PROVIDER_KINDS', function () {
  it('每种类型都有展示名与默认地址字段', function () {
    expect(PROVIDER_KINDS.length).toBeGreaterThan(1)
    PROVIDER_KINDS.forEach(function (kind) {
      expect(kind.label.length).toBeGreaterThan(0)
      expect(typeof kind.baseUrl).toBe('string')
    })
  })

  it('每种类型都能给出预填模型清单（本地运行时可以是空的）', function () {
    PROVIDER_KINDS.forEach(function (kind) {
      expect(Array.isArray(kind.models)).toBe(true)
      kind.models.forEach(function (id) {
        expect(id.trim()).toBe(id)
        expect(id.length).toBeGreaterThan(0)
      })
    })
  })

  it('云端厂商都有能开箱用的模型名（本地运行时没有公开清单）', function () {
    const cloud = ['openai', 'deepseek', 'qwen', 'zhipu']
    cloud.forEach(function (value) {
      const kind = PROVIDER_KINDS.find(function (item) {
        return item.value === value
      })
      expect(kind?.models.length).toBeGreaterThan(0)
    })
  })
})
