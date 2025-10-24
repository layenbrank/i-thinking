import { database } from '@/databases/database.ts'
import { liveQuery } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import {} from 'rxjs'
import { create } from 'zustand'

interface ApplicationStore {
	applications: Application[]
	toInsert: (application: Application) => void
	toUpdate: (application: Application) => void
	toRemove: (application: Application) => void
}

export const useApplicationStore = create<ApplicationStore>(function (set) {
	const store: ApplicationStore = {
		applications:
			useLiveQuery(function () {
				return database.application.orderBy('sort').toArray()
			}) ?? [],
		toInsert(application: Application) {
			return set(function (state) {
				// return database.application.add(application)
				return {
					applications: [...state.applications, application]
				}
			})
		},
		toRemove(application: Application) {
			return set(function (state) {
				return {
					applications: state.applications.filter(function (application) {
						return application.id !== application.id
					})
				}
			})
		},
		toUpdate(application: Application) {
			return set(function (state) {
				return {
					applications: state.applications.map(function (application) {
						return application.id === application.id ? application : application
					})
				}
			})
		}
	}
	return store
})
