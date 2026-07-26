import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { from, Observable, switchMap } from 'rxjs'
import { effectScope, inject, provide, type InjectionKey } from 'vue'

type CollectionStore = ReturnType<typeof useCollection>
const COLLECTION_KEY: InjectionKey<CollectionStore> = Symbol('collection')

function useCollection(collectionID: string) {
  const navigations = useObservable(
    new Observable<string>(function (subscribe) {
      watchEffect(function () {
        if (!collectionID) return
        subscribe.next(collectionID)
      })
    }).pipe(
      switchMap(function (collectionID) {
        return from(
          liveQuery(function () {
            return database.magneticTile.where('collectionID').equals(collectionID).toArray()
          })
        )
      })
    )
  )

  return {
    navigations
  }
}

export function provideStore(collectionID: string) {
  const scope = effectScope()

  const store = scope.run(function () {
    return useCollection(collectionID)
  })
  if (!store) throw new Error('Collection Store is not initialized')

  provide(COLLECTION_KEY, store)
  return { ...store, dispose: () => scope.stop() }
}

export function injectStore(): CollectionStore {
  const store = inject<CollectionStore>(COLLECTION_KEY)

  if (!store) throw new Error('useCollection must be used within app-collection component')

  return store
}
