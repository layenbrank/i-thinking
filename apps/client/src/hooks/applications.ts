import { useLiveQuery } from 'dexie-react-hooks'
import { isEmpty } from 'lodash-es'

import { BuildMirror } from '@/constants/mirror.ts'
import { database } from '@/databases/database.ts'
import { useMirrorStore } from '@/stores/mirror.ts'

function useApplications(): Application[] {
	const { APPLICATIONS } = BuildMirror()
	const mirrorID = useMirrorStore((state) => state.mirrorID)

	const applications = useLiveQuery<Application[], Application[]>(
		async function () {
			if (!mirrorID) return []

			const values = await database.application
				.where('mirrorID')
				.equals(mirrorID)
				.filter((app) => !app.collectionID)
				.sortBy('index')

			if (!isEmpty(values)) return values

			await database.application.bulkAdd(APPLICATIONS)
			return database.application
				.where('mirrorID')
				.equals(mirrorID)
				.filter((app) => !app.collectionID)
				.sortBy('index')
		},
		[mirrorID],
		[]
	)

	return applications
}

export { useApplications }
