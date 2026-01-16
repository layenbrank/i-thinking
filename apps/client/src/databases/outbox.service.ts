import { Client } from '@/databases/client'
import { Singleton } from '@i-thinking/core'
import {
  concatMap,
  defer,
  endWith,
  from,
  ignoreElements,
  map,
  of,
  switchMap,
  tap,
  type Observable
} from 'rxjs'

export type SyncOp = 'upsert' | 'delete'

export interface SyncChange {
  entity: string
  op: SyncOp
  entityId: string
  payload: unknown
}

export interface OutboxRow {
  id: string
  entity: string
  op: SyncOp
  entityId: string
  payload: string
  createdAt: number
  syncedAt: number | null
}

function uuidLike(): string {
  if (crypto.randomUUID) return crypto.randomUUID()

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

@Singleton()
export class OutboxService extends Client {
  static ensured = false

  toEnsure$(): Observable<void> {
    return defer(() => {
      if (OutboxService.ensured) return of(void 0)
      return this.execute$(
        'CREATE TABLE IF NOT EXISTS change_log (id TEXT PRIMARY KEY, entity TEXT, op TEXT, entityId TEXT, payload TEXT, createdAt INTEGER, syncedAt INTEGER)'
      ).pipe(
        tap(() => {
          OutboxService.ensured = true
        }),
        map(function () {
          return
        })
      )
    })
  }

  append$(change: SyncChange): Observable<string> {
    const id = uuidLike()
    const createdAt = Date.now()

    return this.toEnsure$().pipe(
      switchMap(() =>
        this.execute$(
          'INSERT INTO change_log (id, entity, op, entityId, payload, createdAt, syncedAt) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            id,
            change.entity,
            change.op,
            change.entityId,
            JSON.stringify(change.payload ?? null),
            createdAt,
            null
          ]
        )
      ),
      map(() => id)
    )
  }

  pending$(limit = 200): Observable<OutboxRow[]> {
    return this.toEnsure$().pipe(
      switchMap(() =>
        this.query$<OutboxRow>(
          'SELECT * FROM change_log WHERE syncedAt IS NULL ORDER BY createdAt ASC LIMIT $1',
          [limit]
        )
      )
    )
  }

  markSynced$(ids: string[]): Observable<void> {
    const timestamp = Date.now()

    return this.toEnsure$().pipe(
      switchMap(() =>
        ids.length
          ? from(ids).pipe(
              concatMap((id) =>
                this.execute$(
                  'UPDATE change_log SET syncedAt = $1 WHERE id = $2',
                  [timestamp, id]
                )
              ),
              ignoreElements(),
              endWith(void 0)
            )
          : of(void 0)
      )
    )
  }
}

export const outbox = new OutboxService()
