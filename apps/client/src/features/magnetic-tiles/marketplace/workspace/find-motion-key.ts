/** ScrollTrigger 重建键：bucket + query + 可见 id 集合（排序后，与展示顺序无关） */
function findMotionKey(bucket: string, query: string, tiles: Array<{ id: string }>) {
  const ids = tiles
    .map(function (tile) {
      return tile.id
    })
    .sort()
    .join(',')
  return `${bucket}:${query.trim()}:${ids}`
}

/** 布局刷新键：展示顺序变化时仅 refresh，不拆掉进场绑定 */
function findLayoutKey(tiles: Array<{ id: string }>) {
  return tiles
    .map(function (tile) {
      return tile.id
    })
    .join(',')
}

export { findLayoutKey, findMotionKey }
