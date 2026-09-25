import { describe, expect, it } from 'vitest'

import { formatDurationSeconds, formatDurationText, readThreadScoped } from './duration'

describe('formatDurationSeconds', function () {
  it('rounds to whole seconds in integer mode', function () {
    expect(formatDurationSeconds(12_400, 'integer')).toBe(12)
  })

  it('keeps one decimal in precise mode', function () {
    expect(formatDurationSeconds(12_400, 'precise')).toBe(12.4)
  })

  it('rounds a fraction up to the precision it keeps', function () {
    expect(formatDurationSeconds(59_950, 'precise')).toBe(60)
  })
})

describe('formatDurationText', function () {
  it('prints seconds below a minute', function () {
    expect(formatDurationText(12_400, 'integer')).toBe('12s')
  })

  it('prints minutes and seconds above a minute', function () {
    expect(formatDurationText(84_000, 'integer')).toBe('1m 24s')
  })

  it('does not leave a float tail on the second part', function () {
    expect(formatDurationText(119_950, 'precise')).toBe('2m 0s')
    expect(formatDurationText(119_400, 'precise')).toBe('1m 59.4s')
  })

  it('keeps a whole minute readable', function () {
    expect(formatDurationText(60_000, 'integer')).toBe('1m 0s')
  })
})

describe('readThreadScoped', function () {
  it('reads the value stamped for the same thread', function () {
    expect(readThreadScoped({ threadID: 'a', value: 12 }, 'a')).toBe(12)
  })

  it('hides a value stamped for another thread', function () {
    expect(readThreadScoped({ threadID: 'a', value: 12 }, 'b')).toBeNull()
  })

  it('returns null when nothing was recorded yet', function () {
    expect(readThreadScoped(null, 'a')).toBeNull()
  })
})
