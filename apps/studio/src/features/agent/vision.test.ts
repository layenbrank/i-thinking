import { describe, expect, it } from 'vitest'

import { canSeeImages } from '@/features/agent/vision.ts'

describe('canSeeImages', function () {
  it('认出常见视觉模型', function () {
    expect(canSeeImages('gpt-4o')).toBe(true)
    expect(canSeeImages('claude-sonnet-4')).toBe(true)
    expect(canSeeImages('qwen2.5-vl')).toBe(true)
    expect(canSeeImages('llava:13b')).toBe(true)
    expect(canSeeImages('gemini-2.5-flash')).toBe(true)
  })

  it('不把纯文本模型当成能看图', function () {
    expect(canSeeImages('qwen3:8b')).toBe(false)
    expect(canSeeImages('deepseek-v4')).toBe(false)
    expect(canSeeImages('')).toBe(false)
  })
})
