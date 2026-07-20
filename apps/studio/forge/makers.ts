import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import type { ForgeConfig } from '@electron-forge/shared-types'

import {
  APP_AUTHORS,
  APP_DESCRIPTION,
  APP_NAME,
  PRODUCT_NAME
} from './constants'

function buildMakers(): NonNullable<ForgeConfig['makers']> {
  return [
    new MakerSquirrel({
      title: PRODUCT_NAME || APP_NAME,
      name: APP_NAME,
      description: APP_DESCRIPTION,
      authors: APP_AUTHORS
    }),
    new MakerZIP({}, ['win32']),
    new MakerDMG({
      name: PRODUCT_NAME || APP_NAME,
      format: 'ULFO'
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({
      options: {
        name: APP_NAME,
        productName: PRODUCT_NAME || APP_NAME,
        genericName: PRODUCT_NAME || APP_NAME,
        description: APP_DESCRIPTION,
        maintainer: APP_AUTHORS,
        categories: ['Development']
      }
    }),
    new MakerRpm({
      options: {
        name: APP_NAME,
        productName: PRODUCT_NAME || APP_NAME,
        genericName: PRODUCT_NAME || APP_NAME,
        description: APP_DESCRIPTION,
        categories: ['Development']
      }
    }),
    new MakerZIP({}, ['linux'])
  ]
}

export { buildMakers }
