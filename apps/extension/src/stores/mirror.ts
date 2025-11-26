import { ReBuild } from '@/constants/mirror.ts'
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

export interface ToUpdateApplication {
	key: string
	changes: UpdateSpec<Application>
}

export type ToInsertApplication = InsertType<Application, 'id'>

export interface ToUpdateCollection {
	key: string
	changes: UpdateSpec<Collection>
}
export type ToInsertCollection = InsertType<Collection, 'id'>

export const useMirrorStore = defineStore('mirror', function () {
	const mirrorID = ref<string | null>(null)

	const application = ref<Application | null>(null)

	const { APPLICATIONS, MIRRORS } = ReBuild()

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
				console.log('[APPLICATIONS]', APPLICATIONS)

				if (value?.id) mirrorID.value = value?.id
			})
		)
	)

	const applications = useObservable(
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
							database.application
								.where('mirrorID')
								.equals(mirrorID)
								.filter(function (application) {
									// 不具有集合ID的
									return !application.collectionID
								})
								// .offset(1)
								// .limit(30)
								.sortBy('index')
						)
					})
				)
			}),
			tap(function (values) {
				if (isEmpty(values)) void database.application.bulkAdd(APPLICATIONS)

				console.log('[useObservable applications]', values)
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

	async function toReadApplication(keys: string[]) {
		const response = await database.application.bulkGet(keys)
		return response.filter(Boolean)
	}

	function toUpdateApplication(values: ToUpdateApplication[]) {
		return database.application.bulkUpdate(values)
	}

	function toInsertApplication(values: ToInsertApplication[]) {
		return database.application.bulkAdd(values)
	}

	function toRemoveApplication(keys: string[]) {
		return database.application.bulkDelete(keys)
	}

	return {
		mirrorID,
		mirrors,
		application,
		applications,
		toReadMirror,
		toInsertMirror,
		toUpdateMirror,
		toRemoveMirror,
		toReadApplication,
		toUpdateApplication,
		toInsertApplication,
		toRemoveApplication
	}
})
