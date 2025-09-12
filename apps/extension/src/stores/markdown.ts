import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { defineStore } from 'pinia'
import { from, Observable, switchMap } from 'rxjs'

export const useMarkdownStore = defineStore('markdown', function () {
	const markdowns = useObservable(
		from(
			liveQuery(function () {
				return database.markdown.toArray()
			})
		)
	)

	const activeKey = ref<string>()

	const markdown = useObservable(
		new Observable<string>(function (subscribe) {
			watchEffect(function () {
				if (!activeKey.value) return
				subscribe.next(activeKey.value)
			})
		}).pipe(
			switchMap(function (ID) {
				return liveQuery(function () {
					return database.markdown.get(ID)
				})
			})
		)
	)

	function toInsert(markdown: Markdown) {
		if (!markdown.id) return ErrorBoundary('ID')
		return database.markdown.add(markdown)
	}

	function toUpdate(markdown: Partial<Markdown>) {
		if (!markdown.id) return ErrorBoundary('ID')
		return database.markdown.update(markdown.id, markdown)
	}

	function toRemove(id: string) {
		if (!id) return ErrorBoundary('ID')
		return database.markdown.delete(id)
	}

	function ErrorBoundary(key: 'ID') {
		const msgMap = {
			ID: (): Promise<Error> => {
				return Promise.reject(new Error('ID is required for update'))
			},
			unknown: (): Promise<Error> => {
				return Promise.reject(new Error('An unknown error occurred'))
			}
		}
		const handler = msgMap[key] ?? msgMap.unknown
		return handler()
	}

	return {
		markdowns,
		markdown,
		activeKey,
		toInsert,
		toUpdate,
		toRemove
	}
})
