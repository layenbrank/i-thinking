import { describe, expect, it } from 'vitest'
import { theme } from 'antd'

import { APPEARANCE_PRESET } from '@/themes/appearance'
import { RECIPES } from '@/themes/recipes/recipes'
import { buildTheme } from '@/themes/runtime/build'
import { parseScheme } from '@/themes/schemes/schemes'

describe('buildTheme', function () {
  it('uses light algorithm by default appearance', function () {
    const config = buildTheme({ ...APPEARANCE_PRESET, theme: 'light' })
    expect(config.algorithm).toBe(theme.defaultAlgorithm)
    expect(config.token?.colorPrimary).toBe(APPEARANCE_PRESET.color)
    expect(config.token?.borderRadius).toBe(APPEARANCE_PRESET.radius)
    expect(config.cssVar).toEqual({ prefix: 'ith', key: 'ith' })
  })

  it('uses dark algorithm when theme is dark', function () {
    const config = buildTheme({ ...APPEARANCE_PRESET, theme: 'dark' })
    expect(config.algorithm).toBe(theme.darkAlgorithm)
  })

  it('stacks compact algorithm when density is compact', function () {
    const algorithms = parseScheme('light', 'compact')
    expect(Array.isArray(algorithms)).toBe(true)
    const config = buildTheme({ ...APPEARANCE_PRESET, theme: 'light', density: 'compact' })
    expect(Array.isArray(config.algorithm)).toBe(true)
  })

  it('merges user components with recipes', function () {
    const config = buildTheme({
      ...APPEARANCE_PRESET,
      theme: 'light',
      components: {
        Layout: {
          headerBg: '#111111'
        }
      }
    })
    expect(config.components?.Layout?.headerBg).toBe('#111111')
    expect(config.components?.Menu?.itemBg).toBe('#000000')
  })

  it('applies custom color to seed token', function () {
    const config = buildTheme({
      ...APPEARANCE_PRESET,
      theme: 'light',
      color: '#ff0000'
    })
    expect(config.token?.colorPrimary).toBe('#ff0000')
  })

  it('applies modal content padding from recipes', function () {
    expect(RECIPES.Modal?.contentPadding).toBe('12px 16px')
    const config = buildTheme({ ...APPEARANCE_PRESET, theme: 'light' })
    const modal = config.components?.Modal as
      | { contentPadding?: string }
      | undefined
    expect(modal?.contentPadding).toBe('12px 16px')
  })

  it('registers at least 25 component recipes', function () {
    expect(Object.keys(RECIPES).length).toBeGreaterThanOrEqual(25)
  })
})
