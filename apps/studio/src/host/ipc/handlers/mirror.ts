import { CHANNELS } from '../../../shared/ipc/channels'
import { MagneticTileService, MirrorService } from '../../capabilities/magnetic-tile'
import { type DomainHandlers } from '../types'

/**
 * 镜像桌面域：镜像本身 + 其下磁贴（tile）。
 * 主进程落库（drizzle），渲染侧经 itc.mirror / itc.mirror.tile 访问。
 */
export function buildMirrorHandlers(): DomainHandlers<'mirror'> {
  const mirrors = new MirrorService()
  const tiles = new MagneticTileService()

  return {
    [CHANNELS.MIRROR.READ]: function (input) {
      return mirrors.toRead(input)
    },
    [CHANNELS.MIRROR.WRITE]: function (input) {
      return mirrors.toWrite(input)
    },
    [CHANNELS.MIRROR.UPDATE]: function (input) {
      return mirrors.toUpdate(input)
    },
    [CHANNELS.MIRROR.REMOVE]: function (input) {
      return mirrors.toRemove(input)
    },

    [CHANNELS.MIRROR.TILE.READ]: function (input) {
      return tiles.toRead(input)
    },
    [CHANNELS.MIRROR.TILE.WRITE]: function (input) {
      return tiles.toWrite(input)
    },
    [CHANNELS.MIRROR.TILE.UPDATE]: function (input) {
      return tiles.toUpdate(input)
    },
    [CHANNELS.MIRROR.TILE.REMOVE]: function (input) {
      return tiles.toRemove(input)
    }
  }
}
