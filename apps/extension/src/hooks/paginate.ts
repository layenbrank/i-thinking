import type { EntityTable, PromiseExtended } from 'dexie'

interface UsePaginate<T extends Record<string, any>, P extends keyof T = 'id'> {
  page: number
  size: number
  limit: number
  store: EntityTable<T, P>
  // 是否累计
  accumulate?: boolean
  // 是否倒序
  sort?: string
}

export function usePaginate<T extends Record<string, any>>(
  paginate: UsePaginate<T>
): PromiseExtended<T[]> {
  const { page, limit, size, store, accumulate, sort } = paginate

  return store
    .offset((page - 1) * limit)
    .limit(size)
    .toArray()
}

// const resp = await usePaginate({
// 	page: 1,
// 	size: 10,
// 	limit: 10,
// 	store: database.magneticTile
// })

// resp.forEach(function (item) {
// 	item.width
// })
