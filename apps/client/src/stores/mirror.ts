import { database } from '@/databases/database.ts'
import { type InsertType, type UpdateSpec } from 'dexie'
import { create } from 'zustand'

interface ToUpdateMirror {
	key: string
	changes: UpdateSpec<Mirror>
}
type ToInsertMirror = InsertType<Mirror, 'id'>

interface ToRemoveMirror {
	keys: string[]
}
interface ToReadMirror {
	keys: string[]
}

interface ToUpdateApplication {
	key: string
	changes: UpdateSpec<Application>
}
type ToInsertApplication = InsertType<Application, 'id'>
interface ToRemoveApplication {
	keys: string[]
}
interface ToReadApplication {
	keys: string[]
}

interface MirrorStore {
	mirrorID: string | null
	mirror: Mirror | null
	application: Application | null

	toReadMirror: (keys: string[]) => Promise<(Mirror | undefined)[]>
	toUpdateMirror: (values: ToUpdateMirror[]) => Promise<void>
	toInsertMirror: (values: ToInsertMirror[]) => Promise<void>
	toRemoveMirror: (keys: string[]) => Promise<void>

	toReadApplication: (keys: string[]) => Promise<(Application | undefined)[]>
	toUpdateApplication: (values: ToUpdateApplication[]) => Promise<void>
	toInsertApplication: (values: ToInsertApplication[]) => Promise<void>
	toRemoveApplication: (keys: string[]) => Promise<void>
}

const useMirrorStore = create<MirrorStore>(function () {
	const store: MirrorStore = {
		mirrorID: null,
		mirror: null,
		application: null,
		async toUpdateMirror(values) {
			await database.mirror.bulkUpdate(values)
		},
		async toInsertMirror(values) {
			await database.mirror.bulkAdd(values)
		},
		async toRemoveMirror(keys) {
			await database.mirror.bulkDelete(keys)
		},
		async toReadMirror(keys) {
			const response = await database.mirror.bulkGet(keys)
			return response.filter(Boolean)
		},
		async toUpdateApplication(values) {
			await database.application.bulkUpdate(values)
		},
		async toInsertApplication(values) {
			await database.application.bulkAdd(values)
		},
		async toRemoveApplication(keys) {
			await database.application.bulkDelete(keys)
		},
		async toReadApplication(keys) {
			const response = await database.application.bulkGet(keys)
			return response.filter(Boolean)
		}
	}
	return store
})

export type {
	MirrorStore,
	ToInsertApplication,
	ToInsertMirror,
	ToReadApplication,
	ToReadMirror,
	ToRemoveApplication,
	ToRemoveMirror,
	ToUpdateApplication,
	ToUpdateMirror
}

export { useMirrorStore }
