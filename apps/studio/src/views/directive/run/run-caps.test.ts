import { describe, expect, it } from 'vitest'

import { capsFromSummary, capsFromTriggers } from './run-caps'

describe('capsFromTriggers', function () {
  it('按 type 识别 cron / watch', function () {
    expect(capsFromTriggers([{ type: 'cron' }, { type: 'watch' }])).toEqual({
      hasCron: true,
      hasWatch: true
    })
  })

  it('大小写不敏感', function () {
    expect(capsFromTriggers([{ type: 'Cron' }, { type: 'WATCH' }])).toEqual({
      hasCron: true,
      hasWatch: true
    })
  })

  it('空或未声明为都没有', function () {
    expect(capsFromTriggers(undefined)).toEqual({ hasCron: false, hasWatch: false })
    expect(capsFromTriggers([])).toEqual({ hasCron: false, hasWatch: false })
  })
})

describe('capsFromSummary', function () {
  it('信任分项标志', function () {
    expect(
      capsFromSummary({ has_cron: true, has_watch: false, trigger_count: 1 })
    ).toEqual({ hasCron: true, hasWatch: false })
  })

  it('旧 daemon：有 trigger_count 却无分项时先都放开', function () {
    expect(capsFromSummary({ trigger_count: 2, has_cron: false, has_watch: false })).toEqual({
      hasCron: true,
      hasWatch: true
    })
  })

  it('没有触发器时保持关闭', function () {
    expect(capsFromSummary({ trigger_count: 0, has_cron: false, has_watch: false })).toEqual({
      hasCron: false,
      hasWatch: false
    })
    expect(capsFromSummary(null)).toEqual({ hasCron: false, hasWatch: false })
  })
})
