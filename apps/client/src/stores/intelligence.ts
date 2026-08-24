import { invoke } from '@tauri-apps/api/core'
import { Subject } from 'rxjs'
import { create, type StateCreator } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type AiSession = MagneticTile.Intelligence.AiSession
type AiMessage = MagneticTile.Intelligence.AiMessage
type AiCollection = MagneticTile.Intelligence.AiCollection

interface SessionChange {
  title?: string
  pinned?: boolean
  collectionID?: string | null
}

interface MessageChange {
  identity?: AiMessage['identity']
  fragment?: string
  thinking?: string | null
  sessionID?: string
  updatedAt?: number
}

interface SessionUpdate {
  key: string
  change: SessionChange
}

interface MessageUpdate {
  key: string
  change: MessageChange
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
  | 'COLLECTION:SYNCED'

interface IntelligenceEvent<T = unknown> {
  type: EventType
  payload: T
  timestamp: number
}

interface SessionSlice {
  sessions: AiSession[]
  activeSessionID: string | null
  sessionsLoaded: boolean

  toReadSessions(): Promise<AiSession[]>
  toReadSession(key: string): AiSession | null
  toWriteSession(values: AiSession[]): Promise<void>
  toUpdateSession(values: Partial<AiSession>[]): Promise<void>
  toRemoveSession(keys: string[]): Promise<void>
  toUpdateSessions(sessions: AiSession[]): void
}

interface MessageSlice {
  messages: AiMessage[]
  messagesLoaded: boolean

  toReadMessages(sessionID?: string): Promise<AiMessage[]>
  toReadMessage(key: string): AiMessage | null
  toWriteMessage(values: AiMessage[]): Promise<void>
  toUpdateMessage(values: Partial<AiMessage>[], options?: { skip?: boolean }): Promise<void>
  toRemoveMessage(keys: string[]): Promise<void>
  toUpdateMessages(messages: AiMessage[]): void
}

interface CollectionSlice {
  collections: AiCollection[]
  collectionsLoaded: boolean

  toReadCollections(): Promise<AiCollection[]>
  toWriteCollection(values: AiCollection[]): Promise<void>
  toUpdateCollection(values: Partial<AiCollection>[]): Promise<void>
  toRemoveCollection(keys: string[]): Promise<void>
  toUpdateCollections(collections: AiCollection[]): void
}

type IntelligenceStore = SessionSlice & MessageSlice & CollectionSlice

type SliceCreator<T> = StateCreator<
  IntelligenceStore,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  T
>

const event$ = new Subject<IntelligenceEvent>()

function toSessionWrite(value: AiSession) {
  return {
    id: value.id,
    title: value.title,
    pinned: value.pinned,
    collectionID: value.collectionID,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
}

function toMessageWrite(value: AiMessage) {
  return {
    id: value.id,
    identity: value.identity,
    fragment: value.fragment,
    thinking: value.thinking,
    sessionID: value.sessionID,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
}

function toCollectionWrite(value: AiCollection) {
  return {
    id: value.id,
    title: value.title,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
}

const sessionSlice: SliceCreator<SessionSlice> = function (setters, getters) {
  return {
    sessions: [],
    activeSessionID: null,
    sessionsLoaded: false,

    async toReadSessions() {
      try {
        const sessions = await invoke<AiSession[]>('aiSession:toRead', { params: {} })
        setters(
          function (state) {
            state.sessions = sessions
            state.sessionsLoaded = true
            if (!state.activeSessionID && sessions[0]) {
              state.activeSessionID = sessions[0].id
            }
          },
          false,
          'toReadSessions'
        )
        const activeSessionID = getters().activeSessionID
        if (activeSessionID) {
          await getters().toReadMessages(activeSessionID)
        }
        event$.next({
          type: 'SESSION:SYNCED',
          payload: sessions,
          timestamp: Date.now()
        })
        return sessions
      } catch (error) {
        console.error('[intelligence-store] toReadSessions failed:', error)
        setters(
          function (state) {
            state.sessionsLoaded = true
          },
          false,
          'toReadSessions/error'
        )
        return []
      }
    },

    toReadSession(key: string) {
      const now = Date.now()
      const sessions = getters().sessions
      const session = sessions.find(function (item) {
        return item.id === key
      })

      setters(
        function (state) {
          state.activeSessionID = key
        },
        false,
        'toReadSession/active'
      )

      event$.next({
        type: 'SESSION:TOREAD',
        payload: { session },
        timestamp: now
      })

      return session ?? null
    },

    async toWriteSession(values: AiSession[]) {
      const former = structuredClone(getters().sessions)
      setters(
        function (state) {
          state.sessions.push(...values)
        },
        false,
        'toWriteSession/optimistic'
      )

      try {
        await invoke('aiSession:toWrite', {
          params: values.map(toSessionWrite)
        })
        event$.next({
          type: 'SESSION:INSERTED',
          payload: values,
          timestamp: Date.now()
        })
      } catch (error) {
        setters({ sessions: former }, false, 'toWriteSession/rollback')
        throw error
      }
    },

    async toUpdateSession(values: Partial<AiSession>[]) {
      const hasID = values.every(function (v) {
        return Boolean(v.id)
      })
      if (!hasID) throw new Error('ID is required')

      const sessions = structuredClone(getters().sessions)
      const updatesMap = new Map<string, Partial<AiSession>>()
      values.forEach(function (v) {
        if (v.id) updatesMap.set(v.id, v)
      })

      setters(
        function (state) {
          state.sessions = sessions.map(function (item) {
            const update = updatesMap.get(item.id)
            if (!update) return item
            return Object.assign({}, item, update)
          })
        },
        false,
        'toUpdateSession/optimistic'
      )

      try {
        const params: SessionUpdate[] = values.map(function (v) {
          const { id, ...change } = v
          return { key: id!, change }
        })
        await invoke('aiSession:toUpdate', { params })
        event$.next({
          type: 'SESSION:UPDATED',
          payload: values,
          timestamp: Date.now()
        })
      } catch (error) {
        setters({ sessions }, false, 'toUpdateSession/rollback')
        throw error
      }
    },

    async toRemoveSession(keys: string[]) {
      const former = structuredClone(getters().sessions)
      try {
        setters(
          function (state) {
            state.sessions = former.filter(function (session) {
              return !keys.includes(session.id)
            })
            if (state.activeSessionID && keys.includes(state.activeSessionID)) {
              state.activeSessionID = state.sessions[0]?.id ?? null
            }
          },
          false,
          'toRemoveSession/optimistic'
        )
        await invoke('aiSession:toRemove', { params: keys })
        const activeSessionID = getters().activeSessionID
        if (activeSessionID) {
          await getters().toReadMessages(activeSessionID)
        }
        event$.next({
          type: 'SESSION:REMOVED',
          payload: keys,
          timestamp: Date.now()
        })
      } catch (error) {
        setters({ sessions: former }, false, 'toRemoveSession/rollback')
        throw error
      }
    },

    toUpdateSessions(sessions) {
      setters({ sessions }, false, 'toUpdateSessions/synced')
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
    messagesLoaded: false,

    async toReadMessages(sessionID?: string) {
      try {
        const params = sessionID ? { sessionID } : {}
        const messages = await invoke<AiMessage[]>('aiMessage:toRead', { params })
        setters(
          function (state) {
            if (sessionID) {
              const others = state.messages.filter(function (message) {
                return message.sessionID !== sessionID
              })
              state.messages = others.concat(messages).toSorted(function (a, b) {
                return a.createdAt - b.createdAt
              })
            } else {
              state.messages = messages
            }
            state.messagesLoaded = true
          },
          false,
          'toReadMessages'
        )
        event$.next({
          type: 'MESSAGE:SYNCED',
          payload: messages,
          timestamp: Date.now()
        })
        return messages
      } catch (error) {
        console.error('[intelligence-store] toReadMessages failed:', error)
        setters(
          function (state) {
            state.messagesLoaded = true
          },
          false,
          'toReadMessages/error'
        )
        return []
      }
    },

    toReadMessage(key: string) {
      const message = getters().messages.find(function (item) {
        return item.id === key
      })
      event$.next({
        type: 'MESSAGE:TOREAD',
        payload: { message },
        timestamp: Date.now()
      })
      return message ?? null
    },

    async toWriteMessage(values: AiMessage[]) {
      const former = structuredClone(getters().messages)
      setters(
        function (state) {
          state.messages = state.messages.concat(values)
        },
        false,
        'toWriteMessage/optimistic'
      )

      try {
        await invoke('aiMessage:toWrite', {
          params: values.map(toMessageWrite)
        })
        event$.next({
          type: 'MESSAGE:INSERTED',
          payload: values,
          timestamp: Date.now()
        })
      } catch (error) {
        setters({ messages: former }, false, 'toWriteMessage/rollback')
        throw error
      }
    },

    async toUpdateMessage(values: Partial<AiMessage>[], options?: { skip?: boolean }) {
      const hasID = values.every(function (v) {
        return Boolean(v.id)
      })
      if (!hasID) throw new Error('ID is required')

      const messages = structuredClone(getters().messages)
      const updatesMap = new Map<string, Partial<AiMessage>>()
      values.forEach(function (v) {
        if (v.id) updatesMap.set(v.id, v)
      })

      setters(
        function (state) {
          state.messages = state.messages
            .map(function (item) {
              const update = updatesMap.get(item.id)
              if (!update) return item
              return Object.assign({}, item, update)
            })
            .toSorted(function (a, b) {
              return a.createdAt - b.createdAt
            })
        },
        false,
        'toUpdateMessage/optimistic'
      )

      if (options?.skip) return

      try {
        const params: MessageUpdate[] = values.map(function (v) {
          const { id, ...change } = v
          return { key: id!, change }
        })
        await invoke('aiMessage:toUpdate', { params })
        event$.next({
          type: 'MESSAGE:UPDATED',
          payload: values,
          timestamp: Date.now()
        })
      } catch (error) {
        setters({ messages }, false, 'toUpdateMessage/rollback')
        throw error
      }
    },

    async toRemoveMessage(keys: string[]) {
      const former = structuredClone(getters().messages)
      try {
        setters(
          function (state) {
            state.messages = former.filter(function (message) {
              return !keys.includes(message.id)
            })
          },
          false,
          'toRemoveMessage/optimistic'
        )
        await invoke('aiMessage:toRemove', { params: keys })
        event$.next({
          type: 'MESSAGE:REMOVED',
          payload: keys,
          timestamp: Date.now()
        })
      } catch (error) {
        setters({ messages: former }, false, 'toRemoveMessage/rollback')
        throw error
      }
    },

    toUpdateMessages(messages) {
      setters({ messages }, false, 'toUpdateMessages/synced')
      event$.next({
        type: 'MESSAGE:SYNCED',
        payload: messages,
        timestamp: Date.now()
      })
    }
  }
}

const collectionSlice: SliceCreator<CollectionSlice> = function (setters, getters) {
  return {
    collections: [],
    collectionsLoaded: false,

    async toReadCollections() {
      try {
        const collections = await invoke<AiCollection[]>('aiCollection:toRead', { params: {} })
        setters(
          function (state) {
            state.collections = collections
            state.collectionsLoaded = true
          },
          false,
          'toReadCollections'
        )
        event$.next({
          type: 'COLLECTION:SYNCED',
          payload: collections,
          timestamp: Date.now()
        })
        return collections
      } catch (error) {
        console.error('[intelligence-store] toReadCollections failed:', error)
        setters(
          function (state) {
            state.collectionsLoaded = true
          },
          false,
          'toReadCollections/error'
        )
        return []
      }
    },

    async toWriteCollection(values: AiCollection[]) {
      const former = structuredClone(getters().collections)
      setters(
        function (state) {
          state.collections.push(...values)
        },
        false,
        'toWriteCollection/optimistic'
      )
      try {
        await invoke('aiCollection:toWrite', {
          params: values.map(toCollectionWrite)
        })
      } catch (error) {
        setters({ collections: former }, false, 'toWriteCollection/rollback')
        throw error
      }
    },

    async toUpdateCollection(values: Partial<AiCollection>[]) {
      const hasID = values.every(function (v) {
        return Boolean(v.id)
      })
      if (!hasID) throw new Error('ID is required')

      const collections = structuredClone(getters().collections)
      const updatesMap = new Map<string, Partial<AiCollection>>()
      values.forEach(function (v) {
        if (v.id) updatesMap.set(v.id, v)
      })

      setters(
        function (state) {
          state.collections = collections.map(function (item) {
            const update = updatesMap.get(item.id)
            if (!update) return item
            return Object.assign({}, item, update)
          })
        },
        false,
        'toUpdateCollection/optimistic'
      )

      try {
        const params = values.map(function (v) {
          const { id, ...change } = v
          return { key: id!, change }
        })
        await invoke('aiCollection:toUpdate', { params })
      } catch (error) {
        setters({ collections }, false, 'toUpdateCollection/rollback')
        throw error
      }
    },

    async toRemoveCollection(keys: string[]) {
      const former = structuredClone(getters().collections)
      try {
        setters(
          function (state) {
            state.collections = former.filter(function (collection) {
              return !keys.includes(collection.id)
            })
          },
          false,
          'toRemoveCollection/optimistic'
        )
        await invoke('aiCollection:toRemove', { params: keys })
      } catch (error) {
        setters({ collections: former }, false, 'toRemoveCollection/rollback')
        throw error
      }
    },

    toUpdateCollections(collections) {
      setters({ collections }, false, 'toUpdateCollections/synced')
      event$.next({
        type: 'COLLECTION:SYNCED',
        payload: collections,
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
          ...messageSlice(...args),
          ...collectionSlice(...args)
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
  useIntelligenceStore,
  type AiCollection,
  type AiMessage,
  type AiSession,
  type MessageUpdate,
  type SessionUpdate
}
