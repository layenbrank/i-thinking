import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', function () {
  return {
    invoke: vi.fn(function () {
      return Promise.resolve()
    })
  }
})

import { useOverlayStore } from '@/stores/overlay'

describe('overlay store mountTile / removeItem', function () {
  beforeEach(function () {
    useOverlayStore.setState({
      mode: 'idle',
      items: [],
      zCursor: 10
    })
  })

  it('mounts one tile per magneticTileID', function () {
    const store = useOverlayStore.getState()
    store.mountTile('countdown', 'tile-a', { size: 1, shape: 'rectangle' })
    store.mountTile('countdown', 'tile-b', { size: 1, shape: 'rectangle' })

    const tiles = useOverlayStore.getState().items.filter(function (item) {
      return item.kind !== 'texture'
    })
    expect(tiles).toHaveLength(2)
    expect(tiles.map(function (t) {
      return t.id
    })).toEqual(['tile-a', 'tile-b'])
  })

  it('remounting same magneticTileID updates instead of duplicating', function () {
    const store = useOverlayStore.getState()
    store.mountTile('countdown', 'tile-a', { size: 1 })
    store.mountTile('calendar', 'tile-a', { size: 4 })

    const tiles = useOverlayStore.getState().items.filter(function (item) {
      return item.kind !== 'texture'
    })
    expect(tiles).toHaveLength(1)
    expect(tiles[0]?.kind).toBe('calendar')
    expect(tiles[0]?.magneticTileID).toBe('tile-a')
  })

  it('mountTile stores surface style (round / background)', function () {
    const store = useOverlayStore.getState()
    store.mountTile('countdown', 'tile-a', {
      size: 1,
      shape: 'square',
      round: '16px',
      background: { color: '#F1F5F9' }
    })

    const tile = useOverlayStore.getState().items.find(function (item) {
      return item.kind !== 'texture' && item.id === 'tile-a'
    })
    expect(tile && tile.kind !== 'texture' ? tile.round : null).toBe('16px')
    expect(tile && tile.kind !== 'texture' ? tile.background : null).toEqual({ color: '#F1F5F9' })
  })

  it('removeItem drops only the matching magneticTileID', function () {
    const store = useOverlayStore.getState()
    store.mountTile('countdown', 'tile-a', { size: 1 })
    store.mountTile('countdown', 'tile-b', { size: 1 })
    store.removeItem('tile-a')

    const tiles = useOverlayStore.getState().items.filter(function (item) {
      return item.kind !== 'texture'
    })
    expect(tiles).toHaveLength(1)
    expect(tiles[0]?.id).toBe('tile-b')
  })
})
