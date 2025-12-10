import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { defineStore } from 'pinia'
import { Observable, from, switchMap, tap } from 'rxjs'

type AiSession = Application.Intelligence.AiSession
type AiMessage = Application.Intelligence.AiMessage
type CommunicateParams = Application.Intelligence.Communicate.Params
type CommunicateMessage = Application.Intelligence.Communicate.Message

export const useAiStore = defineStore('intelligence', function () {
	const session = ref<AiSession | null>(null)

	const sessions = useObservable(
		from(
			liveQuery(function () {
				return database.AiSession.orderBy('createdAt').reverse().toArray()
			})
		).pipe(
			tap(function (values) {
				if (!values) return
				const [value] = values
				if (!value) return
				if (session.value) return
				session.value = value
			})
		)
	)

	const messages = useObservable(
		new Observable<AiSession>(function (subscribe) {
			watchEffect(function () {
				if (!session.value) return
				subscribe.next(session.value)
			})
		}).pipe(
			switchMap(function (session) {
				return liveQuery(function () {
					return database.AiMessage.where('sessionID').equals(session.id).sortBy('createdAt')
				})
			}),
			tap(function (messages) {
				console.log('messages changed:', messages)
			})
		)
	)

	function toInsertSession() {
		return database.AiSession.add({
			id: crypto.randomUUID(),
			title: '新对话',
			pinned: false,
			collectionID: null,
			createdAt: Date.now(),
			updatedAt: Date.now()
		})
	}

	function toUpdateSession() {
		if (!session.value?.id) throw new ExceptionBoundary('ID', 'required', 'for update')
		return database.AiSession.update(session.value.id, {
			updatedAt: Date.now()
		})
	}

	function toInsertMessage(value: CommunicateMessage) {
		if (!session.value?.id) throw new ExceptionBoundary('sessionID', 'required', 'for insert')
		return database.AiMessage.add({
			id: crypto.randomUUID(),
			sessionID: session.value.id,
			identity: value.role,
			fragment: value.content,
			thinking: null,
			createdAt: Date.now(),
			updatedAt: Date.now()
		})
	}

	class ExceptionBoundary extends Error {
		constructor(key: 'ID' | 'sessionID', type: 'required', message: string) {
			super(`${key} is ${type} ${message}`)
		}
	}

	return {
		session,
		sessions,
		toInsertSession,
		toUpdateSession,
		messages,
		toInsertMessage
	}
})
