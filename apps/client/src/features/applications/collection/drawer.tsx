import { invoke } from '@tauri-apps/api/core'
import { Drawer, Input, message } from 'antd'
import { clsx } from 'clsx'
import Fuse from 'fuse.js'

import styles from '@/features/applications/collection/drawer.module.scss'
import { Controller } from './controller.tsx'

interface OverlayDrawerProps {
  id: string
  visible: boolean
  onUpdateVisible: (value: boolean) => void
}

function OverlayDrawer(props: OverlayDrawerProps) {
  const [keyword, onUpdateKeyword] = useState('')
  const [applications, onUpdateApplications] = useState<Application[]>([])

  useEffect(function () {
    let cancelled = false

    async function toLoad() {
      try {
        const result = await invoke<Application[]>('collection_reads')
        if (cancelled) return

        onUpdateApplications(result ?? [])
      } catch {
        if (cancelled) return

        onUpdateApplications([])
        message.error('应用数据加载失败')
      }
    }

    void toLoad()

    return function () {
      cancelled = true
    }
  }, [])

  const queryApplications = useMemo(
    function () {
      if (!keyword.trim().length) return applications ?? []

      const fuse = new Fuse(applications ?? [], {
        keys: ['title', 'url'],
        threshold: 0.4
      })

      const result = fuse.search(keyword)

      return result.map((v) => v.item)
    },
    [applications, keyword]
  )

  const handleIncrement = useCallback(
    function (e: React.MouseEvent<HTMLElement>) {
      const event = e.nativeEvent
      const target = event.target as HTMLElement

      const closest = target.closest<HTMLElement>('.application')
      if (!closest) return

      const ID = closest.getAttribute('data-id')
      if (!ID) return message.error('应用 ID 未定义，无法新增应用')

      // database.application.update(ID, {
      //   collectionID: props.id
      // } )

      invoke('application_update', { id: ID, collectionID: props.id })

      onUpdateApplications(function (prev) {
        return prev.filter(function (application) {
          return application.id !== ID
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
    // const closest = target.closest('.application')
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
            applications={queryApplications}
          />
        </div>
      </div>
    </Drawer>
  )
}

export { OverlayDrawer, type OverlayDrawerProps }
