import { FEATURE_TILES } from '@/constants/magnetic-tiles'

type MagneticTileOptions = {
  label: string
  value: MagneticTile.Component
}

/** 功能磁贴组件选项（不含 navigation） */
const OPTIONS: MagneticTileOptions[] = FEATURE_TILES.map(function (tile) {
  return {
    label: tile.title,
    value: tile.component
  }
})

export { OPTIONS }
export type { MagneticTileOptions }
