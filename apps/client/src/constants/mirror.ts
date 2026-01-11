import { v4 as UUIDV4 } from 'uuid'
import { generateColor } from '@/utils/generate.ts'

interface ApplicationOptions {
  label: string
  value: Application.Component
}

const OPTIONS: ApplicationOptions[] = [
  {
    label: '书签',
    value: 'bookmark'
  },
  {
    label: '日历',
    value: 'calendar'
  },
  {
    label: '应用商店',
    value: 'marketplace'
  },
  {
    label: 'example',
    value: 'example'
  },
  {
    label: '备忘录',
    value: 'markdown'
  },
  {
    label: '设置',
    value: 'settings'
  },
  {
    label: 'AI Hub',
    value: 'intelligence'
  },
  {
    label: 'Clipchamp',
    value: 'clipchamp'
  },
  {
    label: '应用集合',
    value: 'collection'
  },
  {
    label: '开发者',
    value: 'developer'
  },
  {
    label: '导航',
    value: 'navigation'
  },
  {
    label: '图库',
    value: 'gallery'
  },
  {
    label: '时钟',
    value: 'clock'
  },
  {
    label: '代码',
    value: 'code'
  },
  {
    label: '看板',
    value: 'signboard'
  },
  {
    label: '截屏',
    value: 'screenshot'
  }
]

interface MirrorOptions {
  mirrorID: string | null
}

function BuildMirror(options?: MirrorOptions) {
  const MIRROR_ID = options?.mirrorID ?? crypto?.randomUUID?.() ?? UUIDV4()

  const MIRRORS: readonly Mirror[] = Array.from({ length: 1 }).map(function () {
    const mirror: Mirror = {
      id: MIRROR_ID,
      title: '镜像-01',
      index: 0,
      mark: '',
      description: '默认镜像',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      size: 'mini',
      backdrop: null,
      background: null,
      shape: 'square',
      direction: 'vertical',
      overlay: '#000000AA'
    }

    return mirror
  })

  const MIRROR: Mirror | undefined = MIRRORS.find(function (mirror) {
    return mirror.id === MIRROR_ID
  })

  const APPLICATIONS: readonly Application[] = OPTIONS.map(
    function (single, index) {
      const application: Application = {
        id: crypto?.randomUUID?.(),
        url: single.value === 'navigation' ? 'https://cn.bing.com' : null,
        mark: null,
        title: single.label,
        index: index,
        round: '12px',
        mirrorID: MIRROR_ID,
        textSize: '13px',
        backdrop: null,
        component: single.value,
        textColor: '#ffffff',
        updatedAt: Date.now(),
        createdAt: Date.now(),
        description: single.label,
        collectionID: null,
        downloadCount: 1000,
        background: {
          color: generateColor()
        }
      }
      return application
    }
  )

  return {
    MIRRORS,
    MIRROR,
    MIRROR_ID,
    APPLICATIONS
  }
}

export { BuildMirror }
