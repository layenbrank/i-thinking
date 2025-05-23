import Dexie, {
  type Collection,
  type DBCoreTable,
  type EntityTable,
  type IDType,
  type IndexableType,
  type IndexableTypeArrayReadonly,
  type InsertType,
  type PromiseExtended,
  type Table,
  type TableHooks,
  type TableSchema,
  type ThenShortcut,
  type UpdateSpec,
  type WhereClause
} from 'dexie'

export abstract class BaseModule<
  TEntity extends Record<string, any>,
  TKeyName extends keyof TEntity & string = 'id'
> {
  table: EntityTable<TEntity, TKeyName>

  constructor(table: EntityTable<TEntity, TKeyName>) {
    this.table = table
  }

  get(key: IDType<TEntity, TKeyName>) {
    return this.table.get(key)
  }

  where(equalityCriterias: string | string[]) {
    return this.table.where(equalityCriterias)
  }

  filter(fn: (entity: TEntity) => boolean) {
    return this.table.filter(fn)
  }

  count(thenShortcut: ThenShortcut<number, unknown>) {
    return this.table.count(thenShortcut)
  }

  offset(number: number) {
    return this.table.offset(number)
  }

  limit(number: number) {
    return this.table.limit(number)
  }

  each(
    callback: (
      entity: TEntity,
      cursor: {
        key: any
        primaryKey: IDType<TEntity, TKeyName>
      }
    ) => any
  ) {
    return this.table.each(callback)
  }

  toArray() {
    return this.table.toArray()
  }

  toArrayWithCallback(thenShortcut: ThenShortcut<TEntity[], unknown>) {
    return this.table.toArray(thenShortcut)
  }

  toCollection() {
    return this.table.toCollection()
  }

  orderBy(index: string | string[]) {
    return this.table.orderBy(index)
  }

  reverse() {
    return this.table.reverse()
  }

  mapToClass(constructor: () => void) {
    return this.table.mapToClass(constructor)
  }

  add(value: InsertType<TEntity, TKeyName>, key?: IDType<TEntity, TKeyName>) {
    return this.table.add(value, key)
  }

  update(
    key: TEntity | IDType<TEntity, TKeyName>,
    changes: UpdateSpec<InsertType<TEntity, TKeyName>>
  ) {
    return this.table.update(key, changes)
  }

  updateWithCallback(
    key: TEntity | IDType<TEntity, TKeyName>,
    changes: (
      entity: TEntity,
      ctx: {
        value: UpdateSpec<InsertType<TEntity, TKeyName>>
        primKey: IndexableType
      }
    ) => void | boolean
  ) {
    return this.table.update(key, changes)
  }

  put(value: InsertType<TEntity, TKeyName>, key?: IDType<TEntity, TKeyName>) {
    return this.table.put(value, key)
  }

  delete(key: IDType<TEntity, TKeyName>) {
    return this.table.delete(key)
  }

  clear() {
    return this.table.clear()
  }

  bulkGet(keys: IDType<TEntity, TKeyName>[]) {
    return this.table.bulkGet(keys)
  }

  bulkAdd(
    values: readonly InsertType<TEntity, TKeyName>[],
    keys?: IndexableTypeArrayReadonly,
    options?: {
      allKeys: boolean
    }
  ) {
    return this.table.bulkAdd(values, keys, options)
  }

  bulkPut(
    values: readonly InsertType<TEntity, TKeyName>[],
    keys?: IndexableTypeArrayReadonly,
    options?: {
      allKeys: boolean
    }
  ) {
    return this.table.bulkPut(values, keys, options)
  }

  bulkUpdate(
    keysAndChanges: readonly {
      key: IDType<TEntity, TKeyName>
      changes: UpdateSpec<TEntity>
    }[]
  ) {
    return this.table.bulkUpdate(keysAndChanges)
  }

  bulkDelete(keys: IDType<TEntity, TKeyName>[]) {
    this.table.bulkDelete(keys)
  }

  clearExpired() {
    const now = Date.now()
    return this.table.where('expireTime').below(now).delete()
  }

  async paginate(page = 1, limit = 10) {
    const offset = (page - 1) * limit
    const total = await this.table.count()
    const items = await this.table.offset(offset).limit(limit).toArray()

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  }
}
