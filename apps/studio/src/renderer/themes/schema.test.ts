import { describe, expect, it } from 'vitest'

import { APPEARANCE_PRESET } from '@/themes/appearance'
import { parseAppearance, stringifyAppearance } from '@/themes/schema'

describe('parseAppearance', function () {
  it('round-trips appearance json', function () {
    const raw = stringifyAppearance(APPEARANCE_PRESET)
    const parsed = parseAppearance(raw)
    expect(parsed.theme).toBe(APPEARANCE_PRESET.theme)
    expect(parsed.color).toBe(APPEARANCE_PRESET.color)
    expect(parsed.density).toBe(APPEARANCE_PRESET.density)
  })

  it('filters unknown recipe fields', function () {
    const raw = JSON.stringify({
      version: 1,
      appearance: {
        ...APPEARANCE_PRESET,
        components: {
          Layout: { headerBg: '#111111', unknownToken: '#222222' },
          UnknownComponent: { color: '#333333' }
        }
      }
    })
    const parsed = parseAppearance(raw)
    expect(parsed.components.Layout?.headerBg).toBe('#111111')
    expect((parsed.components.Layout as Record<string, unknown>).unknownToken).toBeUndefined()
    expect((parsed.components as Record<string, unknown>).UnknownComponent).toBeUndefined()
  })
})
