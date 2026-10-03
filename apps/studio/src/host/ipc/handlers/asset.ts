import { CHANNELS } from '../../../shared/ipc/channels'
import { AssetService } from '../../capabilities/asset'
import { type DomainHandlers } from '../types'

/** 资产域：CRUD + 截屏贴图 pin / 用户另存 export */
export function buildAssetHandlers(): DomainHandlers<'asset'> {
  const assets = new AssetService()

  return {
    [CHANNELS.ASSET.READ]: function (input) {
      return assets.toRead(input)
    },
    [CHANNELS.ASSET.WRITE]: function (input) {
      return assets.toWrite(input)
    },
    [CHANNELS.ASSET.UPDATE]: function (input) {
      return assets.toUpdate(input)
    },
    [CHANNELS.ASSET.REMOVE]: function (input) {
      return assets.toRemove(input)
    },
    [CHANNELS.ASSET.PIN]: function (input) {
      return assets.toPin(input)
    },
    [CHANNELS.ASSET.EXPORT]: function (input) {
      return assets.toExport(input)
    }
  }
}
