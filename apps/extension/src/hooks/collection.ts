import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery, type InsertType, type UpdateSpec } from 'dexie'
import { from } from 'rxjs'

export interface UpdateParams {
	key: string
	changes: UpdateSpec<Collection>
}

type InsertParams = InsertType<Collection, 'id'>

function useCollecion(ID: string) {
	const collection = useObservable(
		from(
			liveQuery(function () {
				return database.collection.where('id').equals(ID).first()
			})
		)
	)

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
		toRemove,
		collection
	}
}

export { useCollecion }
