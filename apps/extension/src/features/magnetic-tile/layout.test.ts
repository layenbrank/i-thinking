import { describe, expect, it } from 'vitest'

import { findGridSpan } from './layout'

function buildTile(overrides: Partial<MagneticTile>): MagneticTile {
  return {
    id: 'tile',
    index: 0,
    title: '导航',
    url: 'https://example.com',
    round: '16px',
    mark: null,
    size: 2,
    shape: 'square',
    direction: 'horizontal',
    mirrorID: 'mirror',
    updatedAt: 0,
    createdAt: 0,
    textColor: '#ffffff',
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

describe('findGridSpan', function () {
  it('方形/圆形占 size×size', function () {
    expect(findGridSpan(buildTile({ size: 3, shape: 'circle' }))).toEqual({ w: 3, h: 3 })
  })

  it('横向矩形宽翻倍', function () {
    expect(findGridSpan(buildTile({ size: 2, shape: 'rectangle' }))).toEqual({ w: 4, h: 2 })
  })

  it('纵向矩形高翻倍', function () {
    expect(
      findGridSpan(buildTile({ size: 2, shape: 'rectangle', direction: 'vertical' }))
    ).toEqual({ w: 2, h: 4 })
  })
})
