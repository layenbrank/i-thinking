import { describe, expect, it } from 'vitest'

import { NOTICE_BLIND, NOTICE_HUGE, prepareImages } from '@/features/agent/images.ts'

function message(images?: { mediaType: string; data: string }[]) {
  return {
    role: 'user' as const,
    content: '看一下',
    ...(images ? { images } : {})
  }
}

describe('prepareImages', function () {
  it('纯文本模型会剥掉图片并提示', function () {
    const prepared = prepareImages(
      [message([{ mediaType: 'image/png', data: 'data:image/png;base64,a' }])],
      'qwen3:8b'
    )

    expect(prepared.messages[0]?.images).toBeUndefined()
    expect(prepared.notice).toBe(NOTICE_BLIND)
  })

  it('视觉模型保留装得下的图片', function () {
    const prepared = prepareImages(
      [message([{ mediaType: 'image/png', data: 'data:image/png;base64,a' }])],
      'gpt-4o'
    )

    expect(prepared.messages[0]?.images).toEqual([
      { mediaType: 'image/png', data: 'data:image/png;base64,a' }
    ])
    expect(prepared.notice).toBeNull()
  })

  it('超大图片不进请求', function () {
    const prepared = prepareImages(
      [message([{ mediaType: 'image/png', data: 'x'.repeat(800_000) }])],
      'gpt-4o'
    )

    expect(prepared.messages[0]?.images).toBeUndefined()
    expect(prepared.notice).toBe(NOTICE_HUGE)
  })
})
