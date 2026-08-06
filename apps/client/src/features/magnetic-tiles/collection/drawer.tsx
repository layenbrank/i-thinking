import { invoke } from '@tauri-apps/api/core'
import { Drawer, Input, message } from 'antd'
import { clsx } from 'clsx'
import Fuse from 'fuse.js'

import styles from '@/features/magnetic-tiles/collection/drawer.module.scss'
import { Controller } from './controller.tsx'

interface OverlayDrawerProps {
  id: string
  visible: boolean
  onUpdateVisible: (value: boolean) => void
}

function OverlayDrawer(props: OverlayDrawerProps) {
  const [keyword, onUpdateKeyword] = useState('')
  const [magneticTiles, onUpdateMagneticTiles] = useState<MagneticTile[]>([])

  useEffect(function () {
    let cancelled = false

    async function toLoad() {
      try {
        const result = await invoke<MagneticTile[]>('collection:reads')
        if (cancelled) return

        onUpdateMagneticTiles(result ?? [])
      } catch {
        if (cancelled) return

        onUpdateMagneticTiles([])
        message.error('磁贴数据加载失败')
      }
    }

    void toLoad()

    return function () {
      cancelled = true
    }
  }, [])

  const queriedMagneticTiles = useMemo(
    function () {
      if (!keyword.trim().length) return magneticTiles ?? []

      const fuse = new Fuse(magneticTiles ?? [], {
        keys: ['title', 'url'],
        threshold: 0.4
      })

      const result = fuse.search(keyword)

      return result.map((v) => v.item)
    },
    [magneticTiles, keyword]
  )

  const handleIncrement = useCallback(
    function (e: React.MouseEvent<HTMLElement>) {
      const event = e.nativeEvent
      const target = event.target as HTMLElement

      const closest = target.closest<HTMLElement>('.magnetic-tile')
      if (!closest) return

      const ID = closest.getAttribute('data-id')
      if (!ID) {
        message.error('磁贴 ID 未定义，无法新增磁贴')
        return
      }

      // database.magnetic-tile.update(ID, {
      //   collectionID: props.id
      // } )

      void invoke('magnetic-tile:update', {
        params: { key: ID, change: { collectionID: props.id } }
      })

      onUpdateMagneticTiles(function (prev) {
        return prev.filter(function (magneticTile) {
          return magneticTile.id !== ID
        })
      })
    },
    [props.id]
  )

  const handlePrevent = useCallback(function (e: React.MouseEvent<HTMLElement>) {
    const event = e.nativeEvent
    event.stopPropagation()
    event.preventDefault()

    // const target = event.target as HTMLElement
    // const closest = target.closest('.magnetic-tile')
    // if (!closest) return
  }, [])

  return (
    <Drawer
      title={null}
      closable={false}
      placement="right"
      maskClosable={true}
      open={props.visible}
      getContainer={false}
      destroyOnHidden={true}
      onClose={() => props.onUpdateVisible(false)}
      styles={{
        wrapper: {
          width: '30%'
        }
      }}
      classNames={{
        body: clsx([styles.drawer, styles.body])
      }}>
      <Input
        className={clsx([styles.drawer, styles.match])}
        value={keyword}
        onInput={(e) => onUpdateKeyword(e.currentTarget.value)}
      />
      <div className={clsx([styles.drawer, styles.section])}>
        <div className={clsx([styles.drawer, styles.layout])}>
          <Controller
            onClick={handleIncrement}
            onPrevent={handlePrevent}
            magneticTiles={queriedMagneticTiles}
          />
        </div>
      </div>
    </Drawer>
  )
}

export { OverlayDrawer, type OverlayDrawerProps }
