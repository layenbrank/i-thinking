import type { Communicate } from '@/apis/intelligence.ts'
import { database } from '@/database/database.ts'
import type { AiSession } from '@/database/schemas/intelligence.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { defineStore } from 'pinia'
import { Observable, from, switchMap, tap } from 'rxjs'

export const useAiStore = defineStore('intelligence', function () {
	const session = ref<AiSession | null>(null)

	const sessions = useObservable(
		from(
			liveQuery(function () {
				return database.aiSession.orderBy('createdAt').reverse().toArray()
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
					return database.aiMessage.where('sessionID').equals(session.id).sortBy('createdAt')
				})
			})
		)
	)

	function toInsertSession() {
		return database.aiSession.add({
			id: crypto.randomUUID(),
			sort: 1,
			title: '新对话',
			userID: '1234567890',
			createdAt: Date.now(),
			updatedAt: Date.now()
		})
	}

	function toUpdateSession() {
		if (!session.value?.id) throw new ExceptionBoundary('ID', 'required', 'for update')
		return database.aiSession.update(session.value.id, {
			updatedAt: Date.now()
		})
	}

	function toInsertMessage(value: Communicate.Message) {
		if (!session.value?.id) throw new ExceptionBoundary('sessionID', 'required', 'for insert')
		return database.aiMessage.add({
			id: crypto.randomUUID(),
			sessionID: session.value.id,
			role: value.role,
			content: value.content,
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
