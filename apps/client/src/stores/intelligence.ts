import { type UpdateSpec } from 'dexie'
import { BehaviorSubject, Subject } from 'rxjs'
import { create, type StateCreator } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type AiSession = MagneticTile.Intelligence.AiSession
type AiMessage = MagneticTile.Intelligence.AiMessage

interface UpdateMessage {
  key: string
  changes: UpdateSpec<AiMessage>
}
interface UpdateSession {
  key: string
  changes: UpdateSpec<AiSession>
}

type EventType =
  | 'SESSION:INSERTED'
  | 'SESSION:UPDATED'
  | 'SESSION:REMOVED'
  | 'SESSION:TOREAD'
  | 'SESSION:SYNCED'
  | 'MESSAGE:SYNCED'
  | 'MESSAGE:TOREAD'
  | 'MESSAGE:INSERTED'
  | 'MESSAGE:UPDATED'
  | 'MESSAGE:REMOVED'

interface IntelligenceEvent<T = unknown> {
  type: EventType
  payload: T
  timestamp: number
}

interface SessionSlice {
  sessions: AiSession[]

  // 选择器
  toReadSession: (ID: string) => AiSession | null
  // CRUD 操作
  toInsertSession: (values: AiSession[]) => Promise<void>
  toUpdateSession: (values: UpdateSpec<AiSession>[]) => Promise<void>
  toRemoveSession: (keys: string[]) => Promise<void>

  // 内部方法
  toUpdateSessions: (sessions: AiSession[]) => void
}
interface MessageSlice {
  messages: AiMessage[]

  toReadMessage: (ID: string) => AiMessage | null
  toInsertMessage: (values: AiMessage[]) => Promise<void>
  toUpdateMessage: (values: UpdateSpec<AiMessage>[], options?: { skip?: boolean }) => Promise<void>
  toRemoveMessage: (keys: string[]) => Promise<void>

  toUpdateMessages: (messages: AiMessage[]) => void
}

type IntelligenceStore = SessionSlice & MessageSlice

type SliceCreator<T> = StateCreator<
  IntelligenceStore,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  T
>

const event$ = new Subject<IntelligenceEvent>()

const session$ = new BehaviorSubject<AiSession | null>(null)

const sessionSlice: SliceCreator<SessionSlice> = function (setters, getters) {
  return {
    sessions: [],
    toReadSession(key: string) {
      const now = Date.now()
      const sessions = getters().sessions

      const session = sessions.find(function (session) {
        return session.id === key
      })

      console.log('[toReadSession]', session)

      session$.next(session ?? null)

      event$.next({
        type: 'SESSION:TOREAD',
        payload: { session },
        timestamp: now
      })

      return session ?? null
    },
    async toInsertSession(values: AiSession[]) {
      const former = structuredClone(getters().sessions)
      setters(
        function (state) {
          state.sessions.push(...values)
        },
        false,
        'toInsertSession/optimistic'
      )

      try {
        const now = Date.now()
        // await database.AiSession.bulkAdd(values)
        event$.next({
          type: 'SESSION:INSERTED',
          payload: values,
          timestamp: now
        })
      } catch (error) {
        setters(
          {
            sessions: former
          },
          false,
          'toInsertSession/rollback'
        )
        throw error
      }
    },

    async toUpdateSession(values: UpdateSpec<AiSession>[]) {
      const dearthID = values.every(function (v) {
        if (!v.id) return false
        return true
      })
      if (!dearthID) throw new Error('ID is required')
      const sessions = structuredClone(getters().sessions)

      // 使用 Map 优化查找性能 O(n) 而不是 O(n²)
      const updatesMap = new Map<string, UpdateSpec<AiSession>>()
      values.forEach(function (v) {
        if (v.id && typeof v.id === 'string') updatesMap.set(v.id, v)
      })

      const former = sessions.filter(function (m) {
        return updatesMap.has(m.id)
      })
      const updates: UpdateSession[] = former.map(function (m) {
        const update = updatesMap.get(m.id)!
        return {
          key: m.id,
          changes: {
            ...m,
            ...update
          }
        }
      })

      setters(
        function (state) {
          state.sessions = sessions.map(function (u) {
            const update = updatesMap.get(u.id)
            if (!update) return u
            return Object.assign({}, u, update)
          })
        },
        false,
        'toUpdateSession/optimistic'
      )

      try {
        const now = Date.now()
        // await database.AiSession.bulkUpdate(updates)

        event$.next({
          type: 'SESSION:UPDATED',
          payload: values,
          timestamp: now
        })
      } catch (error) {
        setters(
          {
            sessions: sessions
          },
          false,
          'toUpdateSession/rollback'
        )
        throw error
      }
    },

    async toRemoveSession(keys: string[]) {
      const now = Date.now()
      const former = structuredClone(getters().sessions)
      try {
        const sessions = former.filter(function (session) {
          return !keys.includes(session.id)
        })
        setters(
          {
            sessions: sessions
          },
          false,
          'toRemoveSession/optimistic'
        )
        // await database.AiSession.bulkDelete(keys)

        event$.next({
          type: 'SESSION:REMOVED',
          payload: keys,
          timestamp: now
        })
      } catch (error) {
        setters(
          {
            sessions: former
          },
          false,
          'toRemoveSession/rollback'
        )
        throw error
      }
    },
    toUpdateSessions(sessions) {
      setters(
        {
          sessions
        },
        false,
        'toUpdateSessions/synced'
      )
      event$.next({
        type: 'SESSION:SYNCED',
        payload: sessions,
        timestamp: Date.now()
      })
    }
  }
}
const messageSlice: SliceCreator<MessageSlice> = function (setters, getters) {
  return {
    messages: [],
    toReadMessage(key: string) {
      const now = Date.now()
      const messages = getters().messages

      const message = messages.find(function (message) {
        return message.id === key
      })

      event$.next({
        type: 'MESSAGE:TOREAD',
        payload: { message },
        timestamp: now
      })

      return message ?? null
    },
    async toInsertMessage(values: AiMessage[]) {
      const former = structuredClone(getters().messages)
      setters(
        function (prev) {
          // 插入消息（追加到末尾，不排序）
          // 注意：排序由 toUpdateMessages 从数据库同步时处理，避免重复排序导致无限循环
          // prev.messages = [...prev.messages, ...values]
          prev.messages = prev.messages.concat(values)
          // .toSorted(function (a, b) {
          //   return a.updatedAt - b.updatedAt // 正序：最早的在前
          // })
        },
        false,
        'toInsertMessage/optimistic'
      )

      try {
        const now = Date.now()
        // await database.AiMessage.bulkAdd(values)
        event$.next({
          type: 'MESSAGE:INSERTED',
          payload: values,
          timestamp: now
        })
      } catch (error) {
        setters(
          {
            messages: former
          },
          false,
          'toInsertMessage/rollback'
        )
        throw error
      }
    },

    async toUpdateMessage(values: UpdateSpec<AiMessage>[], options?: { skip?: boolean }) {
      const dearthID = values.every(function (v) {
        if (!v.id) return false
        return true
      })
      if (!dearthID) throw new Error('ID is required')
      const messages = structuredClone(getters().messages)

      // 使用 Map 优化查找性能 O(n) 而不是 O(n²)
      const updatesMap = new Map<string, UpdateSpec<AiMessage>>()
      values.forEach(function (v) {
        if (v.id && typeof v.id === 'string') updatesMap.set(v.id, v)
      })

      const former = messages.filter(function (m) {
        return updatesMap.has(m.id)
      })
      const updates: UpdateMessage[] = former.map(function (m) {
        const update = updatesMap.get(m.id)!
        return {
          key: m.id,
          changes: {
            ...m,
            ...update
          }
        }
      })

      setters(
        function (prev) {
          // 更新消息（不改变顺序，保持原有顺序）
          // 注意：排序由 toUpdateMessages 从数据库同步时处理，避免重复排序导致无限循环
          prev.messages = prev.messages
            .map(function (u) {
              const update = updatesMap.get(u.id)
              if (!update) return u
              return Object.assign({}, u, update)
            })
            .toSorted(function (a, b) {
              return a.updatedAt - b.updatedAt // 正序：最早的在前
            })
        },
        false,
        'toUpdateMessage/optimistic'
      )

      if (options?.skip) return

      try {
        const now = Date.now()
        // await database.AiMessage.bulkUpdate(updates)

        event$.next({
          type: 'MESSAGE:UPDATED',
          payload: values,
          timestamp: now
        })
      } catch (error) {
        setters(
          {
            messages: messages
          },
          false,
          'toUpdateMessage/rollback'
        )
        throw error
      }
    },

    async toRemoveMessage(keys: string[]) {
      const now = Date.now()
      const former = structuredClone(getters().messages)
      try {
        const messages = former.filter(function (message) {
          return !keys.includes(message.id)
        })
        setters(
          {
            messages: messages
          },
          false,
          'toRemoveMessage/optimistic'
        )
        // await database.AiMessage.bulkDelete(keys)

        event$.next({
          type: 'MESSAGE:REMOVED',
          payload: keys,
          timestamp: now
        })
      } catch (error) {
        setters(
          {
            messages: former
          },
          false,
          'toRemoveMessage/rollback'
        )
        throw error
      }
    },
    toUpdateMessages(messages) {
      setters(
        {
          messages
        },
        false,
        'toUpdateMessages/synced'
      )
      event$.next({
        type: 'MESSAGE:SYNCED',
        payload: messages,
        timestamp: Date.now()
      })
    }
  }
}

const useIntelligenceStore = create<IntelligenceStore>()(
  devtools(
    subscribeWithSelector(
      immer(function (...args) {
        return {
          ...sessionSlice(...args),
          ...messageSlice(...args)
        }
      })
    ),
    {
      name: 'IntelligenceStore',
      enabled: import.meta.env.DEV
    }
  )
)

export {
  event$,
  session$,
  useIntelligenceStore,
  type AiMessage,
  type AiSession,
  type UpdateMessage,
  type UpdateSession
}
