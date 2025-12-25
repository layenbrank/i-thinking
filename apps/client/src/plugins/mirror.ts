import { liveQuery } from 'dexie'
import { isEmpty } from 'lodash-es'
import { catchError, from, Observable, Subscription, switchMap, tap } from 'rxjs'

import type { Plugin } from '@/components/provider/plugin.tsx'
import { BuildMirror } from '@/constants/mirror.ts'
import { database } from '@/databases/database.ts'
import { application$, mirror$, useMirrorStore } from '@/stores/mirror'

interface DefineSubscription {
  mirrors: Subscription | null
  applications: Subscription | null
}

const subscription: DefineSubscription = {
  mirrors: null,
  applications: null
}

const MirrorPlugin: Plugin = {
  unique: 'mirror-plugin',
  version: '0.0.1',
  mount() {
    const store = useMirrorStore.getState()
    const { MIRRORS, APPLICATIONS } = BuildMirror()

    subscription.mirrors = from(
      liveQuery(function () {
        return database.mirror.orderBy('index').toArray()
      })
    )
      .pipe(
        tap(function (mirrors) {
          if (isEmpty(mirrors)) database.mirror.bulkAdd(MIRRORS)

          store.toUpdateMirrors(mirrors)
          const [mirror] = mirrors
          if (!mirror$.value) store.toReadMirror(mirror?.id ?? null)
        }),
        catchError(function (error) {
          console.error('Failed to sync mirrors:', error)
          return from(Promise.resolve([]))
        })
      )
      .subscribe()

    subscription.applications = new Observable<string>(function (subscribe) {
      // 订阅 mirror$ 的变化
      const subscription = mirror$.subscribe(function (mirror) {
        // 当 mirror 变化时，如果有 id 就发送到 Observable
        if (mirror?.id) subscribe.next(mirror.id)
      })

      // 返回清理函数，当 Observable 被取消订阅时，也取消 mirror$ 的订阅
      return function () {
        subscription.unsubscribe()
      }
    })
      .pipe(
        switchMap(function (mirrorID) {
          return from(
            liveQuery(function () {
              return database.application
                .where('mirrorID')
                .equals(mirrorID)
                .filter(function (v) {
                  return !v.collectionID
                })
                .sortBy('index')
            })
          )
        }),
        tap(function (applications) {
          if (isEmpty(applications)) database.application.bulkAdd(APPLICATIONS)
          store.toUpdateApplications(applications)
          const [application] = applications
          if (!application$.value) store.toReadApplication(application?.id ?? '')
        }),
        catchError(function (error) {
          console.error('Failed to sync applications:', error)
          return from(Promise.resolve([]))
        })
      )
      .subscribe()

    console.log('[Mount Mirror Plugin] 镜像插件已挂载')
  },
  unmount() {
    subscription.mirrors?.unsubscribe()
    subscription.applications?.unsubscribe()
    subscription.mirrors = null
    subscription.applications = null

    console.log('[Unmount Mirror Plugin] 镜像插件已卸载')
  }
}

export { MirrorPlugin }
