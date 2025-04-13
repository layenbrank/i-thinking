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
import { database } from './slide-app.database'

export abstract class BaseModule<
  TEntity extends Record<string, any>,
  TKeyName extends keyof TEntity & string = 'id'
> {
  table: EntityTable<TEntity, TKeyName>

  constructor(table: EntityTable<TEntity, TKeyName>) {
    this.table = table
  }

  get(key: IDType<TEntity, TKeyName>): PromiseExtended<TEntity | undefined>
  get<R>(
    key: IDType<TEntity, TKeyName>,
    thenShortcut: ThenShortcut<TEntity | undefined, R>
  ): PromiseExtended<R>
  get(equalityCriterias: { [key: string]: any }): PromiseExtended<TEntity | undefined>
  get<R>(
    equalityCriterias: { [key: string]: any },
    thenShortcut: ThenShortcut<TEntity | undefined, R>
  ): PromiseExtended<R>
  get(
    keyOrCriteria: IDType<TEntity, TKeyName> | { [key: string]: any },
    thenShortcut?: ThenShortcut<TEntity | undefined, unknown>
  ): PromiseExtended<TEntity | undefined> | PromiseExtended<unknown> {
    return arguments.length === 1
      ? this.table.get(keyOrCriteria as any)
      : this.table.get(
          keyOrCriteria as any,
          thenShortcut as ThenShortcut<TEntity | undefined, unknown>
        )
  }

  where(
    index: string | string[]
  ): WhereClause<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>>
  where(equalityCriterias: {
    [key: string]: any
  }): Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>>
  where(
    indexOrCriteria: string | string[] | { [key: string]: any }
  ):
    | WhereClause<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>>
    | Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>> {
    return this.table.where(indexOrCriteria as any)
  }

  filter(
    fn: (entity: TEntity) => boolean
  ): Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>> {
    return this.table.filter(fn)
  }

  count(): PromiseExtended<number>
  count<R>(thenShortcut: ThenShortcut<number, R>): PromiseExtended<R>
  count(
    thenShortcut?: ThenShortcut<number, unknown>
  ): PromiseExtended<number> | PromiseExtended<unknown> {
    return arguments.length === 0
      ? this.table.count()
      : this.table.count(thenShortcut as ThenShortcut<number, unknown>)
  }

  offset(
    number: number
  ): Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>> {
    return this.table.offset(number)
  }

  limit(
    number: number
  ): Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>> {
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
  ): PromiseExtended<void> {
    return this.table.each(callback)
  }

  toArray(): PromiseExtended<TEntity[]>
  toArray<R>(thenShortcut: ThenShortcut<TEntity[], R>): PromiseExtended<R>
  toArray(
    thenShortcut?: ThenShortcut<TEntity[], unknown>
  ): PromiseExtended<TEntity[]> | PromiseExtended<unknown> {
    return arguments.length === 0
      ? this.table.toArray()
      : this.table.toArray(thenShortcut as ThenShortcut<TEntity[], unknown>)
  }

  toCollection(): Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>> {
    return this.table.toCollection()
  }

  orderBy(
    index: string | string[]
  ): Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>> {
    return this.table.orderBy(index)
  }

  reverse(): Collection<TEntity, IDType<TEntity, TKeyName>, InsertType<TEntity, TKeyName>> {
    return this.table.reverse()
  }

  mapToClass<C extends new () => TEntity>(constructor: C): C {
    return this.table.mapToClass(constructor) as C
  }

  add(
    value: InsertType<TEntity, TKeyName>,
    key?: IDType<TEntity, TKeyName>
  ): PromiseExtended<IDType<TEntity, TKeyName>> {
    return this.table.add(value, key)
  }

  update(
    key: IDType<TEntity, TKeyName> | TEntity,
    changes: UpdateSpec<InsertType<TEntity, TKeyName>>
  ): PromiseExtended<number>
  update(
    key: IDType<TEntity, TKeyName> | TEntity,
    changes: (entity: TEntity, ctx: { value: any; primKey: IndexableType }) => void | boolean
  ): PromiseExtended<number>
  update(key: IDType<TEntity, TKeyName> | TEntity, changes: unknown): PromiseExtended<number> {
    return this.table.update(key, changes as any)
  }

  put(
    value: InsertType<TEntity, TKeyName>,
    key?: IDType<TEntity, TKeyName>
  ): PromiseExtended<IDType<TEntity, TKeyName>> {
    return this.table.put(value, key)
  }

  delete(key: IDType<TEntity, TKeyName>): PromiseExtended<void> {
    return this.table.delete(key)
  }

  clear(): PromiseExtended<void> {
    return this.table.clear()
  }

  bulkGet(keys: IDType<TEntity, TKeyName>[]): PromiseExtended<(TEntity | undefined)[]> {
    return this.table.bulkGet(keys)
  }

  bulkAdd(
    items: readonly InsertType<TEntity, TKeyName>[]
  ): PromiseExtended<IDType<TEntity, TKeyName>>
  bulkAdd(
    items: readonly InsertType<TEntity, TKeyName>[],
    keys?: IndexableTypeArrayReadonly
  ): PromiseExtended<IDType<TEntity, TKeyName>>
  bulkAdd(
    items: readonly InsertType<TEntity, TKeyName>[],
    keys?: IndexableTypeArrayReadonly,
    options?: { allKeys: boolean }
  ): PromiseExtended<IDType<TEntity, TKeyName>> | PromiseExtended<IDType<TEntity, TKeyName>[]> {
    return this.table.bulkAdd(items, keys, options)
  }

  bulkPut(
    items: readonly InsertType<TEntity, TKeyName>[]
  ): PromiseExtended<IDType<TEntity, TKeyName>>
  bulkPut(
    items: readonly InsertType<TEntity, TKeyName>[],
    keys?: IndexableTypeArrayReadonly
  ): PromiseExtended<IDType<TEntity, TKeyName>>
  bulkPut(
    items: readonly InsertType<TEntity, TKeyName>[],
    keys?: IndexableTypeArrayReadonly,
    options?: { allKeys: boolean }
  ): PromiseExtended<IDType<TEntity, TKeyName>> | PromiseExtended<IDType<TEntity, TKeyName>[]> {
    return this.table.bulkPut(items, keys as any, options)
  }

  bulkUpdate(
    keysAndChanges: ReadonlyArray<{
      key: IDType<TEntity, TKeyName>
      changes: UpdateSpec<TEntity>
    }>
  ): PromiseExtended<number> {
    return this.table.bulkUpdate(keysAndChanges)
  }

  bulkDelete(keys: IDType<TEntity, TKeyName>[]): PromiseExtended<void> {
    return this.table.bulkDelete(keys)
  }
}
