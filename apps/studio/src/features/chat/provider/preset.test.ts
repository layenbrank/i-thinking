import { describe, expect, it } from 'vitest'

import { applyProviderPreset, PROVIDER_FORM_DEFAULTS } from './preset'
import { PROVIDER_SCHEMA } from './schema'

const EMPTY = { name: '', baseUrl: '', model: '', models: [] }

describe('PROVIDER_FORM_DEFAULTS', function () {
  it('新建默认落本机（不需要 Key，开箱可用）', function () {
    expect(PROVIDER_FORM_DEFAULTS.kind).toBe('ollama')
    expect(PROVIDER_FORM_DEFAULTS.baseUrl).toBe('http://127.0.0.1:11434/v1')
    expect(PROVIDER_FORM_DEFAULTS.models).toEqual([])
    expect(PROVIDER_FORM_DEFAULTS.apiKey).toBe('')
    expect(PROVIDER_FORM_DEFAULTS.enabled).toBe(true)
  })
})

describe('applyProviderPreset', function () {
  it('选云端厂商预填地址、名称与常用模型', function () {
    expect(applyProviderPreset('deepseek', EMPTY)).toEqual({
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-flash',
      models: ['deepseek-flash', 'deepseek-v4-pro']
    })
  })

  it('预填结果能直接过校验（云端只差一个 Key）', function () {
    const preset = applyProviderPreset('deepseek', EMPTY)
    const values = { ...PROVIDER_FORM_DEFAULTS, ...preset, kind: 'deepseek', apiKey: 'sk-x' }
    expect(PROVIDER_SCHEMA.safeParse(values).success).toBe(true)
  })

  it('用户手填的地址与模型名不被覆盖', function () {
    const mine = {
      name: '我的代理',
      baseUrl: 'https://proxy.internal/v1',
      model: 'my-model',
      models: ['my-model', 'my-other']
    }

    expect(applyProviderPreset('openai', mine)).toEqual({
      ...mine,
      // 清单是厂商作用域的：新厂商的预设接在前面，手填的名字保留
      models: ['gpt-5.6', 'gpt-5.5-pro', 'gpt-5.4-mini', 'my-model', 'my-other']
    })
  })

  it('出厂值之间互相覆盖，不留上一家的残留', function () {
    const deepseek = applyProviderPreset('deepseek', EMPTY)
    expect(applyProviderPreset('openai', deepseek)).toEqual({
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.6',
      models: ['gpt-5.6', 'gpt-5.5-pro', 'gpt-5.4-mini']
    })
  })

  it('切到没有公开清单的本地运行时，清掉上一家留下的模型名', function () {
    const deepseek = applyProviderPreset('deepseek', EMPTY)
    expect(applyProviderPreset('lm-studio', deepseek)).toEqual({
      name: 'LM Studio',
      baseUrl: 'http://127.0.0.1:1234/v1',
      model: '',
      models: []
    })
  })

  it('只改了一半：手填的那半保留，仍是出厂值的另半跟着新厂商走', function () {
    const half = {
      name: '我的 DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-flash',
      models: ['deepseek-flash', 'deepseek-v4-pro']
    }
    expect(applyProviderPreset('zhipu', half)).toEqual({
      name: '我的 DeepSeek',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-5.3',
      models: ['glm-5.3', 'glm-5.3-flash', 'glm-5.2']
    })
  })

  it('平台网关不在预填范围：原样返回', function () {
    expect(applyProviderPreset('gateway', EMPTY)).toEqual(EMPTY)
  })
})
