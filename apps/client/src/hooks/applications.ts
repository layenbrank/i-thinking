import { isEmpty } from 'lodash-es'
import { invoke } from '@tauri-apps/api/core'

import { BuildMirror } from '@/constants/mirror.ts'
import { mirror$ } from '@/stores/mirror.ts'

function useApplications(): Application[] {
  const { APPLICATIONS } = BuildMirror()
  const [applications, onUpdate] = useState<Application[]>([])

  useEffect(
    function () {
      async function bootstrap() {
        if (!mirror$.value?.id) return []

        let values = await invoke<Application[]>('application_reads', {
          mirrorID: mirror$.value.id
        })

        if (!isEmpty(values)) return values

        await invoke('application_inserts', { applications: APPLICATIONS })

        values = await invoke<Application[]>('application_reads', { mirrorID: mirror$.value.id })

        values = values.filter((app) => !app.collectionID).toSorted((a, b) => a.index - b.index)

        onUpdate(values)
      }

      bootstrap()
    },
    [mirror$.value?.id]
  )

  return applications
}

export { useApplications }
