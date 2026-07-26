import { useMirrorStore } from '@/stores/mirror.ts'

const mirrorStore = useMirrorStore()

function useSettings() {
  const active = ref<MagneticTile | null>(null)

  function updateActive(event: MouseEvent) {
    const target = event.target as HTMLElement

    const closest = target.closest<HTMLElement>('.magnetic-tile')
    if (!closest) return

    const id = closest.dataset.id
    if (!id) return

    const magneticTile = mirrorStore.magneticTiles?.find(function (value) {
      return value.id === id
    })
    if (!magneticTile) return
    active.value = magneticTile
  }

  function updateSetting<T extends keyof MagneticTile>(key: T, value: MagneticTile[T]) {
    if (!active.value) return
    active.value[key] = value
    void mirrorStore.toUpdateMagneticTile([
      {
        key: active.value.id,
        changes: {
          [key]: value
        }
      }
    ])
  }

  watchEffect(function () {
    if (!mirrorStore.magneticTiles) return
    const [magneticTile] = mirrorStore.magneticTiles
    if (!magneticTile) return
    if (active.value) return
    active.value = magneticTile
  })

  return {
    active,
    updateActive,
    updateSetting
  }
}

const scope = effectScope(true)
const store = scope.run(useSettings)

function useStore() {
  if (!store) throw new Error('Settings Store is not initialized')
  return { ...store, dispose: () => scope.stop() }
}

export { useStore }
