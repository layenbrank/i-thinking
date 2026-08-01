import { matchFeatureBucket, type FeatureBucket } from '@/constants/feature-buckets'
import { matchNavigateBucket, type NavigateBucket } from '@/constants/navigate-buckets'
import { searchTiles } from '@/features/magnetic-tiles/marketplace/workspace/search-tiles'

type VisibleCache = {
  magneticTiles: MagneticTile[]
  kind: 'booth' | 'navigate'
  bucket: string
  query: string
  tiles: MagneticTile[]
}

let visibleCache: VisibleCache | null = null

function findCachedTiles(
  magneticTiles: MagneticTile[],
  kind: 'booth' | 'navigate',
  bucket: string,
  query: string
) {
  const cached = visibleCache
  if (
    !cached ||
    cached.magneticTiles !== magneticTiles ||
    cached.kind !== kind ||
    cached.bucket !== bucket ||
    cached.query !== query
  ) {
    return null
  }
  return cached.tiles
}

/** 磁贴列表：分类 + 搜索；同入参复用上次结果（Caption / Section 共享） */
function findBoothTiles(
  magneticTiles: MagneticTile[],
  bucket: FeatureBucket,
  query: string
) {
  const trimmed = query.trim()
  const cached = findCachedTiles(magneticTiles, 'booth', bucket, trimmed)
  if (cached) return cached

  const bucketed = magneticTiles.filter(function (tile) {
    return matchFeatureBucket(tile, bucket)
  })
  const tiles = searchTiles(bucketed, trimmed)
  visibleCache = {
    magneticTiles,
    kind: 'booth',
    bucket,
    query: trimmed,
    tiles
  }
  return tiles
}

/** 网址列表：分类 + 搜索；同入参复用上次结果（Caption / Section 共享） */
function findNavigateTiles(
  magneticTiles: MagneticTile[],
  bucket: NavigateBucket,
  query: string
) {
  const trimmed = query.trim()
  const cached = findCachedTiles(magneticTiles, 'navigate', bucket, trimmed)
  if (cached) return cached

  const bucketed = magneticTiles.filter(function (tile) {
    return (
      tile.component === 'navigation' &&
      Boolean(tile.url) &&
      matchNavigateBucket(tile, bucket)
    )
  })
  const tiles = searchTiles(bucketed, trimmed)
  visibleCache = {
    magneticTiles,
    kind: 'navigate',
    bucket,
    query: trimmed,
    tiles
  }
  return tiles
}

export { findBoothTiles, findNavigateTiles }
