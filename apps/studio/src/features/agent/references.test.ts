import { describe, expect, it } from 'vitest'

import { findLatestReferences, sanitizeReferences } from './references'

/**
 * 引用名单会进系统提示词，所以归一化必须挡在前面：
 * 控制字符、超长、重复、超量都不该落到提示词里。
 */

describe('sanitizeReferences', function () {
  it('keeps order and drops duplicates', function () {
    expect(sanitizeReferences(['a.ts', 'b.ts', 'a.ts'])).toEqual(['a.ts', 'b.ts'])
  })

  it('strips control characters and newlines', function () {
    expect(sanitizeReferences(['src/\nindex.ts', 'a\u0000b'])).toEqual(['src/ index.ts', 'a b'])
  })

  it('drops blanks and truncates over-long paths', function () {
    const actual = sanitizeReferences(['   ', 'x'.repeat(2000)])

    expect(actual).toHaveLength(1)
    expect(actual[0]).toHaveLength(1024)
  })

  it('caps the list size', function () {
    const many = Array.from({ length: 50 }, function (_item, index) {
      return `file-${index}.ts`
    })

    expect(sanitizeReferences(many)).toHaveLength(20)
  })
})

describe('findLatestReferences', function () {
  it('reads the last user message only', function () {
    const actual = findLatestReferences([
      { role: 'user', attachments: ['old.ts'] },
      { role: 'assistant' },
      { role: 'user', attachments: ['new.ts'] }
    ])

    expect(actual).toEqual(['new.ts'])
  })

  it('returns empty when the last user message has no attachments', function () {
    const actual = findLatestReferences([
      { role: 'user', attachments: ['old.ts'] },
      { role: 'user' }
    ])

    expect(actual).toEqual([])
  })

  it('returns empty when there is no user message', function () {
    expect(findLatestReferences([{ role: 'assistant' }])).toEqual([])
  })
})
