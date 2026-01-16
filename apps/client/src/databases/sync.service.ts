import { POST_SYNC_PUSH } from '@/apis/sync.ts'
import { outbox } from '@/databases/outbox.service'
import { Singleton } from '@i-thinking/core'
import { firstValueFrom, map, of, switchMap, type Observable } from 'rxjs'

function findClientID(): string {
  const key = 'i-thinking-client-id'
  const existing = localStorage.getItem(key)
  if (existing) return existing

  const ID = crypto.randomUUID()

  localStorage.setItem(key, ID)
  return ID
}

@Singleton()
export class SyncService {
  syncNow$(): Observable<void> {
    const clientId = findClientID()

    return outbox.pending$(200).pipe(
      switchMap((pending) => {
        if (!pending.length) return of(void 0)

        return POST_SYNC_PUSH({
          clientId,
          changes: pending.map(function (row) {
            return {
              id: row.id,
              entity: row.entity,
              op: row.op,
              entityId: row.entityId,
              payload: JSON.parse(row.payload),
              createdAt: row.createdAt
            }
          })
        }).pipe(
          map((res) => res?.data?.ackIds ?? []),
          switchMap((ackIds) => outbox.markSynced$(ackIds))
        )
      })
    )
  }

  syncNow(): Promise<void> {
    return firstValueFrom(this.syncNow$())
  }
}

export const syncService = new SyncService()
