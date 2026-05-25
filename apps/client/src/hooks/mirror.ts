import { isEmpty } from 'lodash-es'
import { invoke } from '@tauri-apps/api/core'

// 1. 引入默认数据（和 extension 里的 useMirror 一样）
import { BuildMirror } from '@/constants/mirror.ts' // 如果 client 端也有这个 Hook
import { mirror$ } from '@/stores/mirror.ts'

// 2. 导出 React Hook：useMirrors
export function useMirrors(): Mirror[] {
  const { MIRRORS } = BuildMirror()
  const [mirrors, onUpdate] = useState<Mirror[]>([])

  useEffect(function () {
    async function bootstrap() {
      let values = await invoke<Mirror[]>('mirror_reads')

      // 空表时填充默认数据
      if (isEmpty(values)) {
        await invoke('mirror_inserts', { mirrors: MIRRORS })

        values = await invoke<Mirror[]>('mirror_reads')
      }
      values = values.toSorted((a, b) => a.index - b.index)

      onUpdate(values)
    }
    bootstrap()
  }, [])

  // 自动更新 mirrorID（等价于 pinia 里的 tap + mirrorID.value = value.id）
  useEffect(
    function () {
      if (!mirrors.length) return
      const [mirror] = mirrors
      if (mirror.id && mirror$.value?.id === null) {
        mirror$.next(mirror)
      }
    },
    [mirrors]
  )

  return mirrors
}
