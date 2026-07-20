import type { ForgeConfig } from '@electron-forge/shared-types'
import path from 'node:path'

import { PACKAGE_ROOT } from './forge/constants'
import { buildMakers } from './forge/makers'
import { buildPackagerConfig } from './forge/packager'
import { buildPlugins } from './forge/plugins'

const config: ForgeConfig = {
  outDir: path.join(PACKAGE_ROOT, 'out'),
  packagerConfig: buildPackagerConfig(),
  makers: buildMakers(),
  plugins: buildPlugins()
}

export default config
