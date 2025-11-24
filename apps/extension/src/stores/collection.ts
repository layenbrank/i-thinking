import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery, type InsertType, type UpdateSpec } from 'dexie'
import { from } from 'rxjs'

export interface UpdateParams {
	key: string
	changes: UpdateSpec<Collection>
}

type InsertParams = InsertType<Collection, 'id'>

export const useCollectionStore = defineStore('collection', function () {
	async function toRead(keys: string[]) {
		const response = await database.collection.bulkGet(keys)
		return response.filter(Boolean)
	}

	function toInsert(values: InsertParams[]) {
		return database.collection.bulkAdd(values)
	}

	function toUpdate(values: UpdateParams[]) {
		return database.collection.bulkUpdate(values)
	}

	function toRemove(keys: string[]) {
		return database.collection.bulkDelete(keys)
	}

	return {
		toRead,
		toInsert,
		toUpdate,
		toRemove
	}
})
