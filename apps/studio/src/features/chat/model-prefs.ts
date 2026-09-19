/**
 * 模型偏好：思考强度 / 是否出现在列表 / 上下文窗口。
 * 显示状态会过滤模型列表；后两项先落在本机，发送链路还没读。
 */

type ThinkingLevel = 'off' | 'low' | 'medium' | 'high' | 'max'

interface ModelPref {
  isVisible: boolean
  thinking: ThinkingLevel
  contextWindow: number
}

const MODEL_PREFS_KEY = 'studio.chat.modelPrefs'

const THINKING_OPTIONS: { value: ThinkingLevel; label: string }[] = [
  { value: 'off', label: '关闭思考' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'max', label: '极高' }
]

const CONTEXT_STEPS = [128_000, 200_000, 400_000, 1_000_000] as const

const CONTEXT_MARKS = ['128K', '200K', '400K', '1M'] as const

const MODEL_PREF: ModelPref = {
  isVisible: true,
  thinking: 'medium',
  contextWindow: CONTEXT_STEPS[0]
}

function findModelKey(providerID: string, model: string) {
  return `${providerID}::${model}`
}

function parseModelPrefs(raw: string | null): Record<string, ModelPref> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, ModelPref>
  } catch (error) {
    console.warn('[model-prefs] 模型偏好不是合法 JSON', error)
    return {}
  }
}

function readModelPrefs(): Record<string, ModelPref> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return parseModelPrefs(localStorage.getItem(MODEL_PREFS_KEY))
  } catch (error) {
    console.warn('[model-prefs] 读不到模型偏好', error)
    return {}
  }
}

function writeModelPrefs(prefs: Record<string, ModelPref>) {
  try {
    localStorage.setItem(MODEL_PREFS_KEY, JSON.stringify(prefs))
  } catch (error) {
    console.warn('[model-prefs] 写不了模型偏好', error)
    throw error
  }
}

function findModelPref(
  providerID: string,
  model: string,
  prefs?: Record<string, ModelPref>
): ModelPref {
  const map = prefs ?? readModelPrefs()
  return map[findModelKey(providerID, model)] ?? { ...MODEL_PREF }
}

function canThink(model: string) {
  const name = model.toLowerCase()
  return (
    name.includes('o1') ||
    name.includes('o3') ||
    name.includes('o4') ||
    name.includes('r1') ||
    name.includes('thinking') ||
    name.includes('reason') ||
    name.includes('qwq')
  )
}

function findContextIndex(value: number) {
  let nearest = 0
  let best = Math.abs(value - CONTEXT_STEPS[0])
  for (let index = 1; index < CONTEXT_STEPS.length; index += 1) {
    const distance = Math.abs(value - CONTEXT_STEPS[index])
    if (distance < best) {
      best = distance
      nearest = index
    }
  }
  return nearest
}

function findContextByIndex(index: number) {
  const clamped = Math.max(0, Math.min(CONTEXT_STEPS.length - 1, Math.round(index)))
  return CONTEXT_STEPS[clamped]
}

export {
  canThink,
  CONTEXT_MARKS,
  CONTEXT_STEPS,
  findContextByIndex,
  findContextIndex,
  findModelKey,
  findModelPref,
  MODEL_PREF,
  readModelPrefs,
  THINKING_OPTIONS,
  writeModelPrefs
}
export type { ModelPref, ThinkingLevel }
