import { MAGNETIC_TILES } from '@/constants/magnetic-tiles'

type MagneticTileOptions = {
  label: string
  value: MagneticTile.Component
}

const OPTIONS: MagneticTileOptions[] = MAGNETIC_TILES.filter(function (tile) {
  return tile.component !== 'navigation'
}).map(function (tile) {
  return {
    label: tile.title,
    value: tile.component
  }
})

export { OPTIONS }
