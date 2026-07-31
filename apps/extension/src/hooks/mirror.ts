import { Icon } from '@iconify/vue/offline'
import { h, markRaw } from 'vue'

function iconifyMark(icon: string) {
  return markRaw({
    name: `IconifyMark-${icon}`,
    render() {
      return h(Icon, { icon })
    }
  })
}

const DownloadMarker = iconifyMark('ant-design:cloud-download-outlined')
const CloudMarker = iconifyMark('ant-design:cloud-upload-outlined')
const RemoveMarker = iconifyMark('ant-design:delete-outlined')
const InsertMarker = iconifyMark('ant-design:plus-circle-outlined')
const SettingsMarker = iconifyMark('ant-design:setting-outlined')

const AppBookmark = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/bookmark/bookmark.vue')
})
const AppCalendar = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/calendar/calendar.vue')
})
const AppMarkdown = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/markdown/markdown.vue')
})
const AppIntelligence = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/intelligence/intelligence.vue')
})
const AppNavigation = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/navigation/navigation.vue')
})
const AppSettings = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/settings/settings.vue')
})
const AppMarketplace = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/marketplace/marketplace.vue')
})
const AppClipchamp = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/clipchamp/clipchamp.vue')
})
const AppCollection = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/collection/collection.vue')
})
const AppSignboard = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/signboard/signboard.vue')
})
const AppClock = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/clock/clock.vue')
})
const AppGallery = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/gallery/gallery.vue')
})
const AppExample = defineAsyncComponent(function () {
  return import('@/components/magnetic-tiles/example/example.vue')
})

type ContextMenuReflect = Partial<Record<MagneticTile.Component, () => ContextMenuOptions[]>>

const MENUOPTIONS: ContextMenuOptions[] = [
  {
    label: '添加应用',
    key: 'update-app',
    icon: markRaw(InsertMarker)
  },
  {
    label: '删除应用',
    key: 'remove-app',
    icon: markRaw(RemoveMarker)
  },
  {
    label: '更换壁纸',
    key: 'update-wallpaper',
    icon: markRaw(DownloadMarker)
  },
  {
    label: '备份云端',
    key: 'update-backup',
    icon: markRaw(CloudMarker)
  },
  {
    label: '设置',
    key: 'update-settings',
    icon: markRaw(SettingsMarker)
  }
]

const CONTEXTMENU: ContextMenuReflect = {}

const SIZES: readonly Mirror.Size[] = [2, 3, 4, 5, 6, 7]

const APPLICATION: MagneticTile.Reflect = {
  bookmark: AppBookmark,
  calendar: AppCalendar,
  markdown: AppMarkdown,
  settings: AppSettings,
  navigation: AppNavigation,
  intelligence: AppIntelligence,
  marketplace: AppMarketplace,
  clipchamp: AppClipchamp,
  collection: AppCollection,
  clock: AppClock,
  signboard: AppSignboard,
  gallery: AppGallery,
  example: AppExample
}

interface ApplicationOptions {
  label: string
  value: MagneticTile.Component
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
  }
]

interface MirrorOptions {
  mirrorID: string | null
}

function useMirror(options?: MirrorOptions) {
  const MIRROR_ID = options?.mirrorID ?? window.crypto.randomUUID()

  const MIRRORS: readonly Mirror[] = Array.from({ length: 1 }).map(function () {
    const mirror: Mirror = {
      id: MIRROR_ID,
      title: '镜像-01',
      index: 0,
      mark: '',
      description: '默认镜像',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      size: 1,
      backdrop: null,
      background: null,
      shape: 'square',
      direction: 'vertical',
      overlay: '#000000AA'
    }

    return mirror
  })

  const MAGNETIC_TILES: readonly MagneticTile[] = OPTIONS.map(function (value) {
    const magneticTile: MagneticTile = {
      id: window.crypto.randomUUID() as string,
      url: null,
      mark: null,
      title: value.label,
      index: 1,
      round: '12px',
      mirrorID: MIRROR_ID,
      textSize: '13px',
      backdrop: null,
      component: value.value,
      textColor: '#ffffff',
      updatedAt: Date.now(),
      createdAt: Date.now(),
      description: value.label,
      collectionID: null,
      downloadCount: 1000,
      background: {
        color: '#ffffff'
      }
    }
    return magneticTile
  })

  return {
    SIZES,
    MIRRORS,
    MIRROR_ID,
    APPLICATION,
    MAGNETIC_TILES,
    CONTEXTMENU,
    MENUOPTIONS
  }
}

export { useMirror }
