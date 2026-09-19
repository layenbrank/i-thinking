import { describe, expect, it } from 'vitest'

import {
  canThink,
  findContextByIndex,
  findContextIndex,
  findModelPref,
  MODEL_PREF
} from '@/features/chat/model-prefs.ts'

describe('model prefs', function () {
  it('没有存过的模型用默认偏好', function () {
    expect(findModelPref('local', 'qwen3:8b', {})).toEqual(MODEL_PREF)
  })

  it('只有名字像推理模型的才开思考强度', function () {
    expect(canThink('deepseek-r1')).toBe(true)
    expect(canThink('qwen3:8b')).toBe(false)
  })

  it('上下文窗口吸附到最近的刻度', function () {
    expect(findContextIndex(150_000)).toBe(0)
    expect(findContextByIndex(2)).toBe(400_000)
  })
})
