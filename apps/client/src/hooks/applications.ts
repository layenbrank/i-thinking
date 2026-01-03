import { useLiveQuery } from 'dexie-react-hooks'
import { isEmpty } from 'lodash-es'

import { BuildMirror } from '@/constants/mirror.ts'
import { database } from '@/databases/database.ts'
import { mirror$ } from '@/stores/mirror.ts'

function useApplications(): Application[] {
  const { APPLICATIONS } = BuildMirror()

  const applications = useLiveQuery<Application[], Application[]>(
    async function () {
      if (!mirror$.value?.id) return []

      const values = await database.application
        .where('mirrorID')
        .equals(mirror$.value.id)
        .filter((app) => !app.collectionID)
        .sortBy('index')

      if (!isEmpty(values)) return values

      await database.application.bulkAdd(APPLICATIONS)
      return database.application
        .where('mirrorID')
        .equals(mirror$.value.id)
        .filter((app) => !app.collectionID)
        .sortBy('index')
    },
    [mirror$.value?.id],
    []
  )

  return applications
}

export { useApplications }
