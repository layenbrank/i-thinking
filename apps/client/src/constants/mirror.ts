import { v4 as UUIDV4 } from 'uuid'

import { NAVIGATION_SITES } from '@/constants/navigation-sites'
import { generateColor } from '@/utils/generate.ts'

interface MagneticTileOptions {
  label: string
  value: MagneticTile.Component
}

const OPTIONS: MagneticTileOptions[] = [
  {
    label: '书签',
    value: 'bookmark'
  },
  {
    label: '日历',
    value: 'calendar'
  },
  {
    label: '时钟',
    value: 'clock'
  },
  {
    label: '倒计时',
    value: 'countdown'
  },
  {
    label: '代码',
    value: 'code'
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
    label: '应用商店',
    value: 'marketplace'
  },
  {
    label: '备忘录',
    value: 'markdown'
  },
  {
    label: 'morph',
    value: 'morph'
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

function buildNavigationTile(
  mirrorID: string,
  site: { label: string; url: string },
  index: number
): MagneticTile.Write {
  return {
    url: site.url,
    mark: null,
    title: site.label,
    index,
    round: '12px',
    mirrorID,
    backdrop: null,
    size: 1,
    shape: 'square',
    direction: 'vertical',
    component: 'navigation',
    textColor: '#ffffff',
    description: site.label,
    collectionID: null,
    background: {
      color: generateColor()
    }
  }
}

function BuildMirror(options?: MirrorOptions) {
  const MIRROR_ID = options?.mirrorID ?? crypto?.randomUUID?.() ?? UUIDV4()

  const MIRRORS: readonly Mirror.Write[] = Array.from({ length: 1 }).map(function () {
    const mirror: Mirror.Write = {
      title: '镜像-01',
      index: 0,
      mark: '',
      description: '默认镜像',
      backdrop: null,
      background: null,
      overlay: '#000000AA'
    }

    return mirror
  })

  const widgets: MagneticTile.Write[] = OPTIONS.filter(function (single) {
    // navigation 由 NAVIGATION_SITES 批量生成，避免重复占位
    return single.value !== 'navigation'
  }).map(function (single, index) {
    return {
      url: null,
      mark: null,
      title: single.label,
      index,
      round: '12px',
      mirrorID: MIRROR_ID,
      backdrop: null,
      size: 1,
      shape: 'square',
      direction: 'vertical',
      component: single.value,
      textColor: '#ffffff',
      description: single.label,
      collectionID: null,
      background: {
        color: generateColor()
      }
    }
  })

  const navigations: MagneticTile.Write[] = NAVIGATION_SITES.map(function (site, offset) {
    return buildNavigationTile(MIRROR_ID, site, widgets.length + offset)
  })

  const MAGNETIC_TILES: readonly MagneticTile.Write[] = [...widgets, ...navigations]

  return {
    MIRRORS,
    MIRROR_ID,
    MAGNETIC_TILES
  }
}

/** 按 URL 去重，生成待写入的 navigation 磁贴 */
function buildMissingNavigationWrites(
  mirrorID: string,
  existing: readonly MagneticTile[],
  startIndex: number
): MagneticTile.Write[] {
  const urls = new Set(
    existing
      .filter(function (tile) {
        return tile.component === 'navigation' && tile.url
      })
      .map(function (tile) {
        return tile.url as string
      })
  )

  const missing = NAVIGATION_SITES.filter(function (site) {
    return !urls.has(site.url)
  })

  return missing.map(function (site, offset) {
    return buildNavigationTile(mirrorID, site, startIndex + offset)
  })
}

export { BuildMirror, OPTIONS, buildMissingNavigationWrites, buildNavigationTile }
