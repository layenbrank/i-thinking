import { describe, expect, it } from 'vitest'

import { PROVIDER_FORM_DEFAULTS, PROVIDER_KINDS } from './constants'
import { formatModels, parseModels, PROVIDER_SCHEMA } from './schema'

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
})

describe('models 文本与数组互转', function () {
  it('逗号分隔（含多余空格）→ 数组；空 → null', function () {
    expect(parseModels('qwen3:8b, llama3.2:3b')).toEqual(['qwen3:8b', 'llama3.2:3b'])
    expect(parseModels('qwen3:8b')).toEqual(['qwen3:8b'])
    expect(parseModels('   ')).toBeNull()
    expect(parseModels('')).toBeNull()
    expect(parseModels(',,')).toBeNull()
  })

  it('数组 → 文本可往返', function () {
    expect(parseModels(formatModels(['a', 'b']))).toEqual(['a', 'b'])
    expect(formatModels(null)).toBe('')
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
})
