import { liveQuery } from 'dexie'
import { isEmpty } from 'lodash-es'
import { catchError, from, switchMap, tap, type Subscription } from 'rxjs'

import type { Plugin } from '@/components/provider/plugin.tsx'
import { database } from '@/databases/database.ts'
import {
  session$,
  useIntelligenceStore as store
} from '@/stores/intelligence.ts'

interface DefineSubscription {
  sessions$: Subscription | null
  messages$: Subscription | null
}

const subscription: DefineSubscription = {
  sessions$: null,
  messages$: null
}

const IntelligencePlugin: Plugin = {
  unique: 'intelligence-plugin',
  mount() {
    subscription.sessions$ = from(
      liveQuery(function () {
        return database.AiSession.orderBy('updatedAt').reverse().toArray()
      })
    )
      .pipe(
        tap(function (data) {
          if (isEmpty(data)) return
          console.log('[IntelligencePlugin session]', data)
          const [session] = data
          session$.next(session)
          store.getState().toUpdateSessions(data)
        }),
        catchError(function (error) {
          console.error(
            '[IntelligencePlugin] Failed to sync AI sessions:',
            error
          )
          // 返回空数组以避免应用崩溃，但错误已记录
          return from(Promise.resolve([]))
        })
      )
      .subscribe()

    subscription.messages$ = session$
      .pipe(
        switchMap(function (session) {
          const sessionID = session?.id ?? ''
          if (!sessionID) return from(Promise.resolve([]))

          return from(
            liveQuery(function () {
              return database.AiMessage.where('sessionID')
                .equals(sessionID)
                .sortBy('updatedAt')
              // return database.AiMessage.orderBy('updatedAt')
              //   .reverse()
              //   .filter(function (message) {
              //     return message.sessionID === sessionID
              //   })
              //   .toArray()
            })
          )
        }),
        tap(function (data) {
          store.getState().toUpdateMessages(data)
          console.log('[ IntelligencePlugin] messages', data)
        }),
        catchError(function (error) {
          console.error(
            '[IntelligencePlugin] Failed to sync AI messages:',
            error
          )
          // 返回空数组以避免应用崩溃，但错误已记录
          return from(Promise.resolve([]))
        })
      )
      .subscribe()
    console.log('[IntelligencePlugin] 插件已挂载')
  },
  unmount() {
    subscription.sessions$?.unsubscribe()
    subscription.messages$?.unsubscribe()
    subscription.sessions$ = null
    subscription.messages$ = null

    console.log('[IntelligencePlugin] 插件已卸载')
  }
}
export { IntelligencePlugin }
