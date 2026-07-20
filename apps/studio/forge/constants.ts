import path from 'node:path'
import { fileURLToPath } from 'node:url'

import pkg from '../package.json' with { type: 'json' }

const FORGE_DIR = path.dirname(fileURLToPath(import.meta.url))

/** apps/studio 包根目录 */
const PACKAGE_ROOT = path.resolve(FORGE_DIR, '..')

const APP_ID = 'com.i-thinking.studio'
const APP_NAME = 'i-thinking'
const APP_EXECUTABLE = 'i-thinking'
const APP_VERSION = pkg.version
const APP_DESCRIPTION = pkg.description
const APP_AUTHORS = pkg.author.name
const PRODUCT_NAME = pkg.productName

export {
  APP_AUTHORS,
  APP_DESCRIPTION,
  APP_EXECUTABLE,
  APP_ID,
  APP_NAME,
  APP_VERSION,
  FORGE_DIR,
  PACKAGE_ROOT,
  PRODUCT_NAME
}
