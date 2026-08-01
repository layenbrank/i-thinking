import Fuse from 'fuse.js'

const FUSE_KEYS: Array<{ name: keyof MagneticTile; weight: number }> = [
  { name: 'title', weight: 0.5 },
  { name: 'description', weight: 0.3 },
  { name: 'url', weight: 0.2 }
]

const FUSE_THRESHOLD = 0.35

const fuseByTiles = new WeakMap<MagneticTile[], Fuse<MagneticTile>>()

function findFuse(tiles: MagneticTile[]) {
  let fuse = fuseByTiles.get(tiles)
  if (fuse) return fuse

  fuse = new Fuse(tiles, {
    keys: FUSE_KEYS,
    threshold: FUSE_THRESHOLD,
    ignoreLocation: true
  })
  fuseByTiles.set(tiles, fuse)
  return fuse
}

/** Fuse 模糊搜索；空关键词原样返回。同一 tiles 引用复用 Fuse 实例 */
function searchTiles(tiles: MagneticTile[], query: string) {
  const trimmed = query.trim()
  if (!trimmed) return tiles

  return findFuse(tiles)
    .search(trimmed)
    .map(function (hit) {
      return hit.item
    })
}

export { searchTiles }
