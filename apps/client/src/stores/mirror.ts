import { database } from '@/databases/database.ts'
import { useLiveQuery } from 'dexie-react-hooks'
import { liveQuery, type InsertType, type PromiseExtended, type UpdateSpec } from 'dexie'
import { BehaviorSubject, Subject, from, type Observable, type Subscription } from 'rxjs'
import { catchError, debounceTime, filter, map, switchMap, take, tap } from 'rxjs/operators'
import { create } from 'zustand'
import { devtools, type DevtoolsOptions } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { shallow } from 'zustand/shallow'
import { isEmpty } from 'lodash-es'

export interface ToUpdateMirror {
	key: string
	changes: UpdateSpec<Mirror>
}
export type ToInsertMirror = InsertType<Mirror, 'id'>

export interface ToRemoveMirror {
	keys: string[]
}
export interface ToReadMirror {
	keys: string[]
}

export interface ToUpdateApplication {
	key: string
	changes: UpdateSpec<Application>
}
export type ToInsertApplication = InsertType<Application, 'id'>
export interface ToRemoveApplication {
	keys: string[]
}
export interface ToReadApplication {
	keys: string[]
}

export interface MirrorStore {
	mirrorID: string | null
	mirror: Mirror | null
	mirrors: Array<Mirror>
	application: Application | null
	readonly applications: ReadonlyArray<Application>

	toUpdateMirror: (values: ToUpdateMirror[]) => Promise<void>
	toInsertMirror: (values: ToInsertMirror[]) => Promise<void>
	toRemoveMirror: (keys: string[]) => Promise<void>
	toReadMirror: (keys: string[]) => Promise<(Mirror | undefined)[]>
	toUpdateApplication: (values: ToUpdateApplication[]) => Promise<void>
	toInsertApplication: (values: ToInsertApplication[]) => Promise<void>
	toRemoveApplication: (keys: string[]) => Promise<void>
	toReadApplication: (keys: string[]) => Promise<(Application | undefined)[]>
}

const useMirrorStore = create<MirrorStore>(function (set, get) {
	const store: MirrorStore = {
		mirrorID: null,
		mirror: null,
		mirrors: [],
		application: null,
		applications: [],
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
			liveQuery(async function () {
				const response = await database.application.bulkGet(keys)
				return response.filter(Boolean)
			})
			const response = await database.application.bulkGet(keys)
			return response.filter(Boolean)
		}
	}
	return store
})

export { useMirrorStore }
