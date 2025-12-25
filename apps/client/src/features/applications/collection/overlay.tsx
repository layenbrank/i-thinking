import { Icon } from '@iconify/react'
import { clsx } from 'clsx'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { useLiveQuery } from 'dexie-react-hooks'

import { Navigation } from '@/features/controller/reflection.tsx'
import Application from '@/features/application/application.tsx'
import styles from '@/features/applications/collection/overlay.module.scss'
import { useMirrorStore } from '@/stores/mirror.ts'
import { database } from '@/databases/database.ts'
import { OverlayDrawer } from './drawer.tsx'
import { generateColor } from '@/utils/generate.ts'
import { Controller } from '@/features/applications/collection/controller.tsx'

const URLS: { value: string; label: string }[] = [
  { value: 'https://www.baidu.com', label: '百度' },
  { value: 'https://www.taobao.com', label: '淘宝' },
  { value: 'https://www.jd.com', label: '京东' },
  { value: 'https://www.weibo.com', label: '微博' },
  { value: 'https://www.douban.com', label: '豆瓣' },
  { value: 'https://www.bilibili.com', label: '哔哩哔哩' },
  { value: 'https://www.zhihu.com', label: '知乎' },
  { value: 'https://www.sina.com.cn', label: '新浪' },
  { value: 'https://www.qq.com', label: 'QQ' },
  { value: 'https://www.163.com', label: '网易' },
  { value: 'https://www.sohu.com', label: '搜狐' },
  { value: 'https://www.ifeng.com', label: '凤凰网' },
  { value: 'https://www.cctv.com', label: '央视网' },
  { value: 'https://www.iqiyi.com', label: '爱奇艺' },
  { value: 'https://www.youku.com', label: '优酷' },
  { value: 'https://www.toutiao.com', label: '今日头条' },
  { value: 'https://www.xiaohongshu.com', label: '小红书' },
  { value: 'https://www.kuaishou.com', label: '快手' },
  { value: 'https://www.meituan.com', label: '美团' },
  { value: 'https://www.dianping.com', label: '大众点评' },
  { value: 'https://www.suning.com', label: '苏宁' },
  { value: 'https://www.vip.com', label: '唯品会' }
]

const APPLICATIONS: Application[] = URLS.map(function (value, index) {
  const application: Application = {
    id: window.crypto.randomUUID() as string,
    url: value.value,
    mark: null,
    title: value.label,
    index: index,
    round: '12px',
    mirrorID: 'MIRROR_ID',
    textSize: '13px',
    backdrop: null,
    component: 'navigation',
    textColor: '#ffffff',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    description: value.label,
    collectionID: null,
    downloadCount: 1000,
    background: {
      color: generateColor()
    }
  }
  return application
})

interface Props {
  visible: boolean
  id: string
  onUpdateVisible: (value: boolean) => void
}

export default function Overlay(props: Props) {
  // const store = useMirrorStore()
  const applications = useLiveQuery<Application[], Application[]>(
    async function () {
      const response = await database.application
        .where('collectionID')
        .equals(props.id)
        .sortBy('index')
      console.log(
        'Overlay fetched applications for collectionID:',
        props.id,
        '\nresponse:',
        response
      )
      if (response.length) return response
      else return APPLICATIONS
    },
    [],
    APPLICATIONS
  )

  useEffect(
    function () {
      console.log('Overlay applications:', applications)
    },
    [applications]
  )

  const [visible, onUpdateVisible] = useState(false)

  // const applications = useLiveQuery<Application[], Application[]>(
  // 	function () {
  // 		return database.application.where('collectionID').equals(props.id).sortBy('index')
  // 	},
  // 	[props.id],
  // 	[]
  // )

  const uniqueKeys = useMemo(
    function () {
      const keys = applications?.map(function (v) {
        return v.id
      })
      return keys ?? []
    },
    [applications]
  )

  const size: Mirror.Size = 'mini'
  const shape: Mirror.Shape = 'rectangle'
  const direction: Mirror.Direction = 'horizontal'

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      tolerance: 0,
      delay: 1000,
      distance: 10 // 需要移动 10px 才激活拖拽，避免误触
    }
  })

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
    keyboardCodes: {
      start: ['Space', 'Enter'],
      cancel: ['Escape'],
      end: ['Space', 'Enter']
    }
  })

  // 设置传感器，用于检测不同类型的拖拽事件
  const sensors = useSensors(mouseSensor, keyboardSensor)

  function handleDragEnd(event: DragEndEvent) {
    // const { active, over } = event
    // if (!over) return
    // if (active.id === over.id) return
    // const oldIndex = applications?.findIndex(function (v) {
    // 	return v.id === active.id
    // })
    // const newIndex = applications?.findIndex(function (v) {
    // 	return v.id === over.id
    // })
    // const values = arrayMove(applications ?? [], oldIndex ?? 0, newIndex ?? 0)
    // const updates = values.map(function (value, index) {
    // 	return {
    // 		...value,
    // 		index: index
    // 	}
    // })
    // console.log('[toUpdateApplication] updates', updates)
    // store.toUpdateApplications(updates)
  }

  return (
    <Application.Overlay
      style={{
        overflow: 'hidden'
      }}
      open={props.visible}
      onCancel={() => props.onUpdateVisible(false)}
      onOk={() => props.onUpdateVisible(false)}>
      {/* <div className={styles.overlay}>Overlay</div> */}
      <div className={clsx([styles.overlay, styles.operations, 'gap-x-2'])}>
        <Icon
          width="20"
          height="20"
          onClick={() => onUpdateVisible(true)}
          icon="ant-design:appstore-add-outlined"
          className="cursor-pointer hover:text-[#4080ff] transition-colors duration-300"></Icon>
        <Icon
          width="20"
          height="20"
          onClick={() => props.onUpdateVisible(false)}
          icon="ant-design:close-circle-filled"
          className="cursor-pointer hover:text-[#ff4040] transition-colors duration-300"></Icon>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]}>
        <SortableContext
          items={uniqueKeys}
          strategy={rectSortingStrategy}>
          <Controller applications={applications} />
        </SortableContext>
      </DndContext>

      <OverlayDrawer
        id={props.id}
        visible={visible}
        onUpdateVisible={onUpdateVisible}></OverlayDrawer>
    </Application.Overlay>
  )
}
