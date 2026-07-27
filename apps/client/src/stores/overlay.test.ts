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
    store.mountTile('countdown', 'tile-a', { size: 'mini', shape: 'rectangle' })
    store.mountTile('countdown', 'tile-b', { size: 'mini', shape: 'rectangle' })

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
    store.mountTile('countdown', 'tile-a', { size: 'mini' })
    store.mountTile('calendar', 'tile-a', { size: 'large' })

    const tiles = useOverlayStore.getState().items.filter(function (item) {
      return item.kind !== 'texture'
    })
    expect(tiles).toHaveLength(1)
    expect(tiles[0]?.kind).toBe('calendar')
    expect(tiles[0]?.magneticTileID).toBe('tile-a')
  })

  it('removeItem drops only the matching magneticTileID', function () {
    const store = useOverlayStore.getState()
    store.mountTile('countdown', 'tile-a', { size: 'mini' })
    store.mountTile('countdown', 'tile-b', { size: 'mini' })
    store.removeItem('tile-a')

    const tiles = useOverlayStore.getState().items.filter(function (item) {
      return item.kind !== 'texture'
    })
    expect(tiles).toHaveLength(1)
    expect(tiles[0]?.id).toBe('tile-b')
  })
})
