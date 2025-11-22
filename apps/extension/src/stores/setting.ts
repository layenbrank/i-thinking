import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { from } from 'rxjs'

export const useSettingStore = defineStore('setting', function () {
	const settings = useObservable(
		from(
			liveQuery(function () {
				return database.setting.toArray()
			})
		)
	)

	// function toUpdate () { }

	return {
		settings
	}
})
