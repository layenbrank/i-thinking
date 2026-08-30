import type { ForgeConfig } from '@electron-forge/shared-types'
import path from 'node:path'

import { PACKAGE_ROOT } from './forge/constants'
import { cleanupBeforePackage } from './forge/hooks/cleanup'
import { buildMakers } from './forge/makers'
import { buildPackagerConfig } from './forge/packager'
import { buildPlugins } from './forge/plugins'
import { buildPublishers } from './forge/publishers'

const config: ForgeConfig = {
  outDir: path.join(PACKAGE_ROOT, 'out'),
  packagerConfig: buildPackagerConfig(),
  rebuildConfig: {
    // 与 postinstall electron-rebuild 对齐；打包阶段再确保 native 匹配 Electron ABI
    force: false
  },
  makers: buildMakers(),
  publishers: buildPublishers(),
  plugins: buildPlugins(),
  hooks: {
    async prePackage() {
      await cleanupBeforePackage()
    }
  }
}

export default config
