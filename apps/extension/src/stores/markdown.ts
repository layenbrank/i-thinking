import { database } from '@/database/database.ts'
import { type DocumentType } from '@tiptap/vue-3'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { defineStore } from 'pinia'
import { from, tap } from 'rxjs'

export const useMarkdownStore = defineStore('markdown', function () {
	const activeKey = ref<string>()

	const markdowns = useObservable(
		from(
			liveQuery(function () {
				return database.markdown.orderBy('sort').toArray()
			})
		).pipe(
			tap(function (values) {
				if (!values.length) return
				if (activeKey.value) return
				const [value] = values
				console.log('values', values)

				activeKey.value = value?.id
			})
		)
	)

	// const markdown = useObservable(
	// 	new Observable<string>(function (subscribe) {
	// 		watchEffect(function () {
	// 			if (!activeKey.value) return
	// 			subscribe.next(activeKey.value)
	// 		})
	// 	}).pipe(
	// 		switchMap(function (ID) {
	// 			return liveQuery(function () {
	// 				return toRead(ID)
	// // const response = toRead(ID)
	// // return response instanceof ExceptionBoundary ? undefined : response
	// 			})
	// 		})
	// 	)
	// )

	function toInsert(markdown: Markdown) {
		if (!markdown.id) return new ExceptionBoundary('ID', 'required', 'for insert')
		return database.markdown.add(markdown)
	}

	function toUpdate(markdown: Partial<Markdown>) {
		if (!markdown.id) return new ExceptionBoundary('ID', 'required', 'for update')
		return database.markdown.update(markdown.id, markdown)
	}

	function toRemove(id: string) {
		if (!id) return new ExceptionBoundary('ID', 'required', 'for remove')
		return database.markdown.delete(id)
	}

	function toRead(ID: string) {
		// if (!ID) return new ExceptionBoundary('ID', 'required', 'for read')
		return database.markdown.get(ID)
	}

	function toGenerate() {
		const values = markdowns.value?.toSorted(function (a, b) {
			return b.sort - a.sort
		})
		const [markdown] = values ?? []
		const sort = markdown?.sort ?? 0

		const value: Markdown = {
			content: [],
			type: 'doc',
			attrs: {},
			sort: sort + 1,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			id: crypto.randomUUID()
		}

		return value
	}

	// 递归查找标题
	function findHead(value?: DocumentType): string {
		if (!value) return '新建文档'

		for (const item of value.content) {
			// if (item.type !== 'heading') continue
			if (!item.content) continue
			const [title] = item.content
			if (title) return title.text
			else return findHead(item as DocumentType)
		}

		return '新建文档'
	}

	// function ErrorBoundary(key: 'ID') {
	// 	const msgMap = {
	// 		ID(): Error {
	// 			return new Error('ID is required for update')
	// 		},
	// 		unknown(): Error {
	// 			return new Error('An unknown error occurred')
	// 		}
	// 	}
	// 	const handler = msgMap[key] ?? msgMap.unknown
	// 	return handler()
	// }

	class ExceptionBoundary extends Error {
		constructor(key: 'ID', type: 'required', message: string) {
			super(`${key} is ${type} ${message}`)
		}
	}

	return {
		markdowns,
		// markdown,
		activeKey,
		toInsert,
		toUpdate,
		toRemove,
		toRead,
		toGenerate,
		findHead
	}
})
