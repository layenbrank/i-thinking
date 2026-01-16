import type { Plugin } from '@/components/provider/plugin.tsx'
import { database } from '@/databases/client'
import { markdownRepo } from '@/databases/markdown.repo'
import { outbox } from '@/databases/outbox.service'
import type { Subscription } from 'rxjs'
import { catchError, concatMap, of } from 'rxjs'

let subscription: Subscription | undefined

const StoragePlugin: Plugin = {
  unique: 'storage-plugin',
  mount() {
    subscription = database
      .ready$()
      .pipe(
        concatMap(() => outbox.toEnsure$()),
        concatMap(() => markdownRepo.toEnsure$()),
        catchError(function (error) {
          console.error('StoragePlugin init failed:', error)
          return of(void 0)
        })
      )
      .subscribe()
  },
  unmount() {
    subscription?.unsubscribe()
    subscription = undefined
  }
}
export { StoragePlugin }
