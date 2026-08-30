import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerFlatpak } from '@electron-forge/maker-flatpak'
import { MakerMSIX } from '@electron-forge/maker-msix'
import { MakerPKG } from '@electron-forge/maker-pkg'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerWix } from '@electron-forge/maker-wix'
import { MakerZIP } from '@electron-forge/maker-zip'
import type { ForgeConfig } from '@electron-forge/shared-types'

import {
  APP_AUTHORS,
  APP_DESCRIPTION,
  APP_ID,
  APP_NAME,
  PRODUCT_NAME
} from './constants'
import {
  MAKE_FLATPAK,
  MAKE_MSIX,
  MAKE_PKG,
  MAKE_WIX,
  MSIX_IDENTITY,
  MSIX_PUBLISHER,
  S3_UPDATE_BASE,
  WINDOWS_CERTIFICATE_FILE,
  WINDOWS_CERTIFICATE_PASSWORD
} from './env'

function buildMakers(): NonNullable<ForgeConfig['makers']> {
  const makers: NonNullable<ForgeConfig['makers']> = [
    new MakerSquirrel({
      title: PRODUCT_NAME || APP_NAME,
      name: APP_NAME,
      description: APP_DESCRIPTION,
      authors: APP_AUTHORS,
      // 增量更新：指向已发布的 Squirrel feed（可选）
      ...(S3_UPDATE_BASE
        ? {
            remoteReleases: `${S3_UPDATE_BASE}/win32`
          }
        : {})
    }),
    new MakerZIP({}, ['win32']),
    new MakerDMG({
      name: PRODUCT_NAME || APP_NAME,
      format: 'ULFO'
    }),
    new MakerZIP(
      S3_UPDATE_BASE
        ? {
            macUpdateManifestBaseUrl: `${S3_UPDATE_BASE}/darwin`
          }
        : {},
      ['darwin']
    ),
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

  // macOS installer pkg（需 darwin）
  if (MAKE_PKG) {
    makers.push(
      new MakerPKG({
        name: PRODUCT_NAME || APP_NAME,
        identity: process.env.APPLE_IDENTITY
      })
    )
  }

  // Windows MSIX（需 Windows SDK / makeappx；STUDIO_MAKE_MSIX=1）
  if (MAKE_MSIX) {
    makers.push(
      new MakerMSIX({
        manifestVariables: {
          publisher: MSIX_PUBLISHER,
          packageIdentity: MSIX_IDENTITY
        },
        ...(WINDOWS_CERTIFICATE_FILE
          ? {
              windowsSignOptions: {
                certificateFile: WINDOWS_CERTIFICATE_FILE,
                certificatePassword: WINDOWS_CERTIFICATE_PASSWORD
              }
            }
          : {})
      })
    )
  }

  // Windows MSI（需 WiX Toolset；STUDIO_MAKE_WIX=1）
  if (MAKE_WIX) {
    makers.push(
      new MakerWix({
        name: PRODUCT_NAME || APP_NAME,
        description: APP_DESCRIPTION,
        manufacturer: APP_AUTHORS,
        appUserModelId: APP_ID,
        ui: {
          chooseDirectory: true
        }
      })
    )
  }

  // Linux Flatpak（需 flatpak-builder；STUDIO_MAKE_FLATPAK=1）
  if (MAKE_FLATPAK) {
    makers.push(
      new MakerFlatpak({
        options: {
          id: APP_ID,
          productName: PRODUCT_NAME || APP_NAME,
          genericName: PRODUCT_NAME || APP_NAME,
          description: APP_DESCRIPTION,
          categories: ['Development'],
          runtime: 'org.freedesktop.Platform',
          runtimeVersion: '24.08',
          sdk: 'org.freedesktop.Sdk',
          files: []
        }
      })
    )
  }

  return makers
}

export { buildMakers }
