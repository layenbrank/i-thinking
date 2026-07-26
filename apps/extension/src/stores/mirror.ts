import { useMirror } from '@/hooks/mirror.ts'
// import { ReBuild } from '@/constants/mirror.ts'
import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery, type InsertType, type UpdateSpec } from 'dexie'
import { isEmpty } from 'lodash-es'
import { from, Observable, switchMap, tap } from 'rxjs'

export interface ToUpdateMirror {
  key: string
  changes: UpdateSpec<Mirror>
}

export type ToInsertMirror = InsertType<Mirror, 'id'>

export interface ToUpdateMagneticTile {
  key: string
  changes: UpdateSpec<MagneticTile>
}

export type ToInsertMagneticTile = InsertType<MagneticTile, 'id'>

export interface ToUpdateCollection {
  key: string
  changes: UpdateSpec<MagneticTile.Collection>
}
export type ToInsertCollection = InsertType<MagneticTile.Collection, 'id'>

export const useMirrorStore = defineStore('mirror', function () {
  const mirrorID = ref<string | null>(null)

  const magneticTile = ref<MagneticTile | null>(null)

  const { MAGNETIC_TILES, MIRRORS } = useMirror()

  const mirrors = useObservable(
    from(
      liveQuery(function () {
        return database.mirror.orderBy('index').toArray()
      })
    ).pipe(
      tap(function (values) {
        if (isEmpty(values)) void database.mirror.bulkAdd(MIRRORS)
        const [value] = values
        console.log('[useObservable mirrors]', values)
        console.log('[MAGNETIC_TILES]', MAGNETIC_TILES)

        if (value?.id) mirrorID.value = value?.id
      })
    )
  )

  const magneticTiles = useObservable(
    new Observable<string>(function (subscribe) {
      watchEffect(function () {
        if (!mirrorID.value) return
        subscribe.next(mirrorID.value)
      })
    }).pipe(
      switchMap(function (mirrorID) {
        return from(
          liveQuery(function () {
            return (
              database.magneticTile
                .where('mirrorID')
                .equals(mirrorID)
                .filter(function (magneticTile) {
                  // 不具有集合ID的
                  return !magneticTile.collectionID
                })
                // .offset(1)
                // .limit(30)
                .sortBy('index')
            )
          })
        )
      }),
      tap(function (values) {
        if (isEmpty(values)) void database.magneticTile.bulkAdd(MAGNETIC_TILES)

        console.log('[useObservable magneticTiles]', values)
      })
      // map( function ( values ) {
      // })
    )
  )

  function toInsertMirror(values: ToInsertMirror[]) {
    return database.mirror.bulkAdd(values)
  }

  function toUpdateMirror(values: ToUpdateMirror[]) {
    return database.mirror.bulkUpdate(values)
  }

  function toRemoveMirror(keys: string[]) {
    return database.mirror.bulkDelete(keys)
  }
  async function toReadMirror(keys: string[]) {
    const response = await database.mirror.bulkGet(keys)
    return response.filter(Boolean)
  }

  async function toReadMagneticTile(keys: string[]) {
    const response = await database.magneticTile.bulkGet(keys)
    return response.filter(Boolean)
  }

  function toUpdateMagneticTile(values: ToUpdateMagneticTile[]) {
    return database.magneticTile.bulkUpdate(values)
  }

  function toInsertMagneticTile(values: ToInsertMagneticTile[]) {
    return database.magneticTile.bulkAdd(values)
  }

  function toRemoveMagneticTile(keys: string[]) {
    return database.magneticTile.bulkDelete(keys)
  }

  return {
    mirrorID,
    mirrors,
    magneticTile,
    magneticTiles,
    toReadMirror,
    toInsertMirror,
    toUpdateMirror,
    toRemoveMirror,
    toReadMagneticTile,
    toUpdateMagneticTile,
    toInsertMagneticTile,
    toRemoveMagneticTile
  }
})
