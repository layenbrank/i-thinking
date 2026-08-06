/**
 * Page-range helpers for split preview (1-based human ranges ↔ 0-based indexes).
 */

function parseRangesToIndexes(rangesText: string, pageCount: number): number[] {
  const indexes: number[] = []
  const parts = rangesText
    .split(/[,;\n]+/)
    .map(function (part) {
      return part.trim()
    })
    .filter(Boolean)

  for (const part of parts) {
    const bits = part.split('-').map(function (bit) {
      return Number(bit.trim())
    })
    const start = bits[0]
    const end = bits[1] ?? start
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    const from = Math.max(1, Math.min(start, end))
    const to = Math.min(pageCount, Math.max(start, end))
    for (let page = from; page <= to; page += 1) {
      indexes.push(page - 1)
    }
  }

  return [...new Set(indexes)].sort(function (a, b) {
    return a - b
  })
}

function buildRangesFromIndexes(indexes: number[]): string {
  if (!indexes.length) return ''
  const sorted = [...new Set(indexes)].sort(function (a, b) {
    return a - b
  })
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]
    if (current === prev + 1) {
      prev = current
      continue
    }
    ranges.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`)
    start = current
    prev = current
  }
  ranges.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`)
  return ranges.join(', ')
}

function toggleIndex(indexes: ReadonlySet<number>, pageIndex: number): Set<number> {
  const next = new Set(indexes)
  if (next.has(pageIndex)) next.delete(pageIndex)
  else next.add(pageIndex)
  return next
}

export { parseRangesToIndexes, buildRangesFromIndexes, toggleIndex }
