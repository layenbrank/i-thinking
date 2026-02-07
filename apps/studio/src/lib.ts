import { app } from 'electron'
import path from 'node:path'

/**
 * 解析 bin 目录下可执行文件的路径。
 * - 开发：APP_ROOT/src/bin/{exeName}
 * - 打包：resourcesPath/bin/{exeName}
 */
export function getBinPath(exeName: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', exeName)
  }
  return path.join(process.env.APP_ROOT ?? process.cwd(), 'src', 'bin', exeName)
}
