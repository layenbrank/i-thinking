// import { isEmpty } from 'lodash-es'
// import { catchError, from, type Subscription, switchMap, tap } from 'rxjs'

import type { Plugin } from '@/components/provider/plugin.tsx'
// import { BuildMirror } from '@/constants/mirror.ts'
// import { application$, mirror$, useMirrorStore as store } from '@/stores/mirror'

// interface DefineSubscription {
//   mirrors: Subscription | null
//   applications: Subscription | null
// }

// const subscription: DefineSubscription = {
//   mirrors: null,
//   applications: null
// }

const MirrorPlugin: Plugin = {
  unique: 'mirror-plugin',
  mount() {
    // const store = useMirrorStore.getState()
    // const { MIRRORS, APPLICATIONS } = BuildMirror()
    // subscription.mirrors = from(
    //   liveQuery(function () {
    //     return database.mirror.orderBy('index').toArray()
    //   })
    // )
    //   .pipe(
    //     tap(function (mirrors) {
    //       if (isEmpty(mirrors)) return database.mirror.bulkAdd(MIRRORS)
    //       store.getState().toUpdateMirrors(mirrors)
    //       const [mirror] = mirrors
    //       if (!mirror$.value) {
    //         void store.getState().toReadMirror(mirror?.id ?? null)
    //       }
    //     }),
    //     catchError(function (error) {
    //       console.error('[MirrorPlugin] Failed to sync mirrors:', error)
    //       // 返回空数组以避免应用崩溃，但错误已记录
    //       return from(Promise.resolve([]))
    //     })
    //   )
    //   .subscribe()
    // subscription.applications = mirror$
    //   .pipe(
    //     switchMap(function (mirror) {
    //       const mirrorID = mirror?.id ?? ''
    //       console.log('同步镜像应用，当前镜像ID：', mirrorID)
    //       if (!mirrorID) return from(Promise.resolve([]))
    //       return from(
    //         liveQuery(function () {
    //           return database.application
    //             .where('mirrorID')
    //             .equals(mirrorID)
    //             .filter(function (v) {
    //               return !v.collectionID
    //             })
    //             .sortBy('index')
    //         })
    //       )
    //     }),
    //     tap(function (applications) {
    //       if (!mirror$.value) return
    //       console.log('mirror$', mirror$.value)
    //       console.log('applications', applications)
    //       if (isEmpty(applications)) {
    //         return database.application.bulkAdd(APPLICATIONS)
    //       }
    //       store.getState().toUpdateApplications(applications)
    //       const [application] = applications
    //       if (!application$.value) {
    //         void store.getState().toReadApplication(application?.id ?? '')
    //       }
    //     }),
    //     catchError(function (error) {
    //       console.error('[MirrorPlugin] Failed to sync applications:', error)
    //       // 返回空数组以避免应用崩溃，但错误已记录
    //       return from(Promise.resolve([]))
    //     })
    //   )
    //   .subscribe()
    // console.log('[Mount Mirror Plugin] 镜像插件已挂载')
  },
  unmount() {
    // subscription.mirrors?.unsubscribe()
    // subscription.applications?.unsubscribe()
    // subscription.mirrors = null
    // subscription.applications = null
    // console.log('[Unmount Mirror Plugin] 镜像插件已卸载')
  }
}

export { MirrorPlugin }
