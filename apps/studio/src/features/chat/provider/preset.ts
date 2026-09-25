import {
  DEFAULT_KIND,
  PROVIDER_KINDS,
  type ProviderKindOption
} from '@/features/chat/provider/constants.ts'
import { isPresetModelID } from '@/features/chat/provider/models.ts'
import type { ProviderValues } from '@/features/chat/provider/schema.ts'

/**
 * 供应商预设 → 表单字段。
 *
 * 用户选中一家厂商时，把这一家「开箱能用」的地址、名字、模型名填进去，
 * 省掉「选完厂商还得去官网抄模型名、手敲端点」。
 *
 * 覆盖规则只有一条：**当前值还是出厂值（空串，或等于某家预设的值）才覆盖**。
 * 用户改过的地址、模型一律不动——切厂商不该抹掉手工配置。
 *
 * 模型清单是唯一例外：它是**厂商作用域的**（换厂商整体换成新厂商的清单，
 * 否则会出现「OpenAI 的地址配 DeepSeek 的模型名」这种组合），
 * 但用户手敲的、不属于任何预设的名字保留下来。
 *
 * 平台网关（`gateway`）不在预填范围内：它的地址由服务端下发，模型来自服务端目录。
 */

/** 预设能填的字段（也就是表单里跟厂商强相关的这几个） */
interface PresetFields {
  name: string
  baseUrl: string
  model: string
  models: string[]
}

const PRESET_TEXT_KEYS = ['name', 'baseUrl', 'model'] as const satisfies ReadonlyArray<
  keyof PresetFields
>

type PresetTextField = (typeof PRESET_TEXT_KEYS)[number]

/**
 * 每个文本字段的出厂值取法。表驱动：以后厂商预设多一个文本字段，只在这里加一行。
 */
const FIND_PRESET_TEXT: Record<PresetTextField, (preset: ProviderKindOption) => string> = {
  name: function (preset) {
    return preset.label
  },
  baseUrl: function (preset) {
    return preset.baseUrl
  },
  model: function (preset) {
    return preset.models[0] ?? ''
  }
}

/** 预设的值是「出厂值」还是用户手填的 */
function isPresetValue(field: PresetTextField, current: string): boolean {
  if (current === '') return true

  return PROVIDER_KINDS.some(function (preset) {
    return FIND_PRESET_TEXT[field](preset) === current
  })
}

/** 换厂商时的模型清单：新厂商的预设在前，用户手敲的名字跟在后面 */
function mergePresetModelIDs(current: readonly string[], preset: readonly string[]): string[] {
  return [
    ...preset,
    ...current.filter(function (id) {
      return !isPresetModelID(id)
    })
  ]
}

/** 套用预设：返回套用后的字段值（未命中的字段原样返回） */
function applyProviderPreset(kind: string, current: PresetFields): PresetFields {
  const preset = PROVIDER_KINDS.find(function (item) {
    return item.value === kind
  })
  if (!preset) return current

  const next = { ...current }
  for (const field of PRESET_TEXT_KEYS) {
    if (!isPresetValue(field, current[field])) continue
    next[field] = FIND_PRESET_TEXT[field](preset)
  }
  next.models = mergePresetModelIDs(current.models, preset.models)

  return next
}

const EMPTY_PRESET_FIELDS: PresetFields = { name: '', baseUrl: '', model: '', models: [] }

/** 新建 provider 的初值：本机预设的出厂值（不需要 Key，开箱可用） */
const PROVIDER_FORM_DEFAULTS: ProviderValues = {
  ...applyProviderPreset(DEFAULT_KIND, EMPTY_PRESET_FIELDS),
  kind: DEFAULT_KIND,
  apiKey: '',
  enabled: true
}

export { applyProviderPreset, PROVIDER_FORM_DEFAULTS }
export type { PresetFields }
