import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'

import {
  createModelPort,
  findSelectedProvider,
  findSelectionRepair,
  findTargetLabel,
  findTargetModel,
  findTargetProvider,
  findUsableProviders,
  isAutoSelection,
  resolveTarget
} from './model'

// 自愈要走 toast 提示用户「模型换了」，node 环境里没有 Toast 容器
vi.mock('sonner', function () {
  return { toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() } }
})

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

/** 组织模型行（平台网关） */
function buildPlatform(overrides: Partial<ProviderRow> = {}): ProviderRow {
  return buildProvider({
    id: 'platform-gateway',
    kind: 'gateway',
    name: '组织模型',
    baseUrl: 'https://api.example.com/gateway',
    model: 'gpt-5',
    ...overrides
  })
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
    const providers = [buildProvider({ id: 'a', model: '', models: [{ id: 'qwen3:8b' }] })]

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

  it('未选择时组织模型优先于个人模型', function () {
    const rows = [buildProvider({ id: 'a' }), buildPlatform(), buildProvider({ id: 'z' })]
    const picked = findSelectedProvider(rows, { providerID: null, model: '' })

    expect(picked?.id).toBe('platform-gateway')
  })

  it('组织行不可用时仍取第一个可用的个人模型', function () {
    const rows = [buildPlatform({ enabled: false }), buildProvider({ id: 'a' })]
    const picked = findSelectedProvider(rows, { providerID: null, model: '' })

    expect(picked?.id).toBe('a')
  })

  it('选中的 provider 不可用时回落', function () {
    const picked = findSelectedProvider(providers, { providerID: 'gone', model: '' })

    expect(picked?.id).toBe('a')
  })

  it('选中的 provider 不可用时也优先回落组织模型', function () {
    const rows = [buildProvider({ id: 'a' }), buildPlatform()]
    const picked = findSelectedProvider(rows, { providerID: 'gone', model: '' })

    expect(picked?.id).toBe('platform-gateway')
  })
})

describe('isAutoSelection', function () {
  it('没有钉住 provider 就是自动', function () {
    expect(isAutoSelection({ providerID: null, model: '' })).toBe(true)
    expect(isAutoSelection({ providerID: 'a', model: '' })).toBe(false)
  })
})

describe('resolveTarget', function () {
  const providers = [buildProvider({ id: 'a', model: 'qwen3:8b', models: [{ id: 'qwen3:14b' }] })]

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

  /**
   * 覆盖可能指向一个已经不在清单里的 id（服务端目录下架、BYOK 清单被编辑）。
   * 那种 id 发出去必然失败：主进程按名字查目录，查不到就报错。
   */
  it('覆盖不在该行清单里时退回 provider 默认', function () {
    expect(resolveTarget(providers, { providerID: 'a', model: 'deepseek-chat' })).toEqual({
      providerID: 'a',
      model: 'qwen3:8b'
    })
  })

  it('没有可用 provider 时返回 null', function () {
    expect(resolveTarget([], { providerID: null, model: '' })).toBeNull()
  })
})

describe('findSelectionRepair', function () {
  const deepseek = buildProvider({
    id: 'provider-deepseek',
    model: 'deepseek-flash',
    models: [{ id: 'deepseek-flash' }]
  })

  it('选中的行已被删除时回到自动', function () {
    const repaired = findSelectionRepair([deepseek], [deepseek], {
      providerID: 'deleted-byok-row',
      model: ''
    })

    expect(repaired).toEqual({ providerID: null, model: '' })
  })

  it('覆盖的模型已下架时清掉覆盖，保留选中的行', function () {
    const repaired = findSelectionRepair([deepseek], [deepseek], {
      providerID: 'provider-deepseek',
      model: 'deepseek-chat'
    })

    expect(repaired).toEqual({ providerID: 'provider-deepseek', model: '' })
  })

  /**
   * 平台行在未登录 / 未配服务地址时会被 `dropStalePlatformRow` 滤掉，那只是暂时不给用。
   * 拿**已过滤**的清单判存在性的话，用户「我用组织模型」的选择会被永久改写成自动。
   */
  it('平台行只是被滤掉时不动设置', function () {
    const rows = [buildPlatform({ model: 'auto', models: [{ id: 'auto' }] }), deepseek]

    expect(
      findSelectionRepair(rows, [deepseek], { providerID: 'platform-gateway', model: 'auto' })
    ).toBeNull()
  })

  it('没问题的选择不需要修', function () {
    // 手填模型的行没有清单，无从校验，一律放行
    const handwritten = buildProvider({ id: 'handwritten', model: 'qwen3:8b', models: null })

    expect(
      findSelectionRepair([handwritten], [handwritten], { providerID: 'handwritten', model: '' })
    ).toBeNull()
    expect(
      findSelectionRepair([deepseek], [deepseek], {
        providerID: 'provider-deepseek',
        model: 'deepseek-flash'
      })
    ).toBeNull()
  })
})

describe('findTargetLabel', function () {
  it('未钉住时给出兜底模型并标记自动', function () {
    const rows = [buildPlatform(), buildProvider({ id: 'a' })]
    const label = findTargetLabel(rows, { providerID: null, model: '' })

    expect(label).toEqual({ model: 'gpt-5', source: '组织模型', isAuto: true })
  })

  it('钉住时展示个人模型的来源与展示名', function () {
    const rows = [buildPlatform(), buildProvider({ id: 'a', name: '本地 Ollama' })]
    const label = findTargetLabel(rows, { providerID: 'a', model: '' })

    expect(label).toEqual({ model: 'qwen3:8b', source: '我的模型 · 本地 Ollama', isAuto: false })
  })

  it('没有可用模型时为 null', function () {
    expect(findTargetLabel([], { providerID: null, model: '' })).toBeNull()
  })
})

describe('findTargetProvider / findTargetModel', function () {
  const deepseek = buildProvider({
    id: 'provider-deepseek',
    kind: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-flash',
    models: [{ id: 'deepseek-flash' }]
  })

  function stubProviders(rows: ProviderRow[]): void {
    vi.stubGlobal('itc', {
      chat: {
        provider: {
          toRead: async function () {
            return rows
          }
        }
      }
    })
    // 令牌存储：读不到令牌 ⇒ 平台行「不可用」（未登录），于是被 `dropStalePlatformRow` 滤掉
    vi.stubGlobal('localStorage', {
      getItem: function () {
        return null
      }
    })
  }

  beforeEach(function () {
    vi.clearAllMocks()
  })

  afterEach(function () {
    vi.unstubAllGlobals()
  })

  /**
   * 老契约是 `findHost?: () => …`，宿主扩展在热更期间新旧模块并存时可能一次都不带目标地被读到。
   * 这时必须按「这条目标还没解析过」处理，而不是让 `undefined.providerID` 把整轮运行打断。
   */
  it('目标没带进来时返回 null 而不是抛错', function () {
    expect(findTargetProvider(undefined)).toBeNull()
    expect(findTargetModel(undefined)).toBeNull()
  })

  it('没解析过的目标返回 null', function () {
    expect(
      findTargetProvider({ providerID: 'provider-deepseek', model: 'deepseek-flash' })
    ).toBeNull()
    expect(findTargetModel({ providerID: 'provider-deepseek', model: 'deepseek-flash' })).toBeNull()
  })

  it('解析过的目标能按 providerID + 模型取回 provider 与模型行', async function () {
    stubProviders([deepseek])
    const port = createModelPort(function () {
      return { providerID: deepseek.id, model: 'deepseek-flash' }
    })

    const target = await port.findTarget()
    if (!target) throw new Error('发送前应当解析出运行目标')

    expect(target).toEqual({ providerID: deepseek.id, model: 'deepseek-flash' })
    expect(findTargetProvider(target)?.id).toBe(deepseek.id)
    expect(findTargetModel(target)?.id).toBe('deepseek-flash')
  })

  it('解析出的模型行换了 provider 就不复用', async function () {
    stubProviders([deepseek, buildProvider({ id: 'other', model: 'qwen3:8b' })])
    const port = createModelPort(function () {
      return { providerID: deepseek.id, model: 'deepseek-flash' }
    })

    await port.findTarget()

    expect(findTargetProvider({ providerID: 'other', model: 'qwen3:8b' })).toBeNull()
  })

  /**
   * 用户存的模型 id 会过期：目录下架、BYOK 行被删。发送时不修的话，运行落在别的模型上、
   * 菜单里却还是那个旧名字，两边永远对不上 —— 所以既要跑对，也要把结论写回设置。
   */
  it('模型已下架时改用该行默认模型，并把结论写回设置', async function () {
    stubProviders([deepseek])
    const repair = vi.fn(async function () {})
    const port = createModelPort(function () {
      return { providerID: deepseek.id, model: 'deepseek-chat' }
    }, repair)

    const target = await port.findTarget()

    expect(target).toEqual({ providerID: deepseek.id, model: 'deepseek-flash' })
    expect(repair).toHaveBeenCalledWith({ providerID: deepseek.id, model: '' })
    expect(toast.warning).toHaveBeenCalledWith(
      '模型 deepseek-chat 已不在目录中，已改用该行默认模型。'
    )
  })

  it('选中的行已被删除时切回自动，并把结论写回设置', async function () {
    stubProviders([buildProvider({ id: 'local', model: 'qwen3:8b' })])
    const repair = vi.fn(async function () {})
    const port = createModelPort(function () {
      return { providerID: 'deleted-byok-row', model: '' }
    }, repair)

    const target = await port.findTarget()

    expect(target).toEqual({ providerID: 'local', model: 'qwen3:8b' })
    expect(repair).toHaveBeenCalledWith({ providerID: null, model: '' })
    expect(toast.warning).toHaveBeenCalledWith('原来选中的模型提供方已被删除，已切回「自动」。')
  })

  it('平台行只是被滤掉时照旧按选中的行解析，不改设置', async function () {
    const platform = buildPlatform({ model: 'auto', models: [{ id: 'auto' }] })
    stubProviders([platform, buildProvider({ id: 'local', model: 'qwen3:8b' })])
    const repair = vi.fn(async function () {})
    const port = createModelPort(function () {
      return { providerID: platform.id, model: 'auto' }
    }, repair)

    await port.findTarget()

    expect(repair).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('写回设置失败不影响这次运行', async function () {
    stubProviders([deepseek])
    const port = createModelPort(
      function () {
        return { providerID: deepseek.id, model: 'deepseek-chat' }
      },
      async function () {
        throw new Error('IPC 挂了')
      }
    )

    expect(await port.findTarget()).toEqual({ providerID: deepseek.id, model: 'deepseek-flash' })
  })
})
