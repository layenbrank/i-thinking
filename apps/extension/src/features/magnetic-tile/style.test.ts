import { describe, expect, it } from 'vitest'

import { buildTileStyle } from './style'

/** 自定义属性不在 CSSProperties 里，读的时候显式收窄 */
function readRound(style: ReturnType<typeof buildTileStyle>): unknown {
  return (style as Record<string, unknown>)['--magnetic-tile-round']
}

function buildTile(overrides: Partial<MagneticTile>): MagneticTile {
  return {
    id: 'tile',
    index: 0,
    title: '导航',
    url: null,
    round: '16px',
    mark: null,
    size: 2,
    shape: 'square',
    direction: 'horizontal',
    mirrorID: 'mirror',
    updatedAt: 0,
    createdAt: 0,
    textColor: null,
    component: 'navigation',
    description: '',
    collectionID: null,
    downloadCount: 0,
    background: null,
    backdrop: null,
    archivedAt: null,
    ...overrides
  }
}

describe('buildTileStyle', function () {
  it('无数据时回落到默认底色与圆角', function () {
    const style = buildTileStyle(null)

    expect(style.backgroundColor).toBe('var(--card)')
    expect(style.backgroundSize).toBe('cover')
    expect(readRound(style)).toBeUndefined()
  })

  it('背景图存在时不画底色', function () {
    const style = buildTileStyle(buildTile({ background: { image: 'https://example.com/a.png' } }))

    expect(style.backgroundImage).toBe('url(https://example.com/a.png)')
    expect(style.backgroundColor).toBeUndefined()
  })

  it('圆角写进自定义属性', function () {
    const style = buildTileStyle(buildTile({ round: '24px' }))

    expect(readRound(style)).toBe('24px')
  })
})
