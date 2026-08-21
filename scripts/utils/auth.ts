import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Singleton } from '@/utils/singleton.ts'

const AUTH_TOKEN_KEY = 'token'
const TOKEN_PATH = resolve(process.cwd(), AUTH_TOKEN_KEY)

/**
 * 本地登录态 token 读写（落盘到仓库根目录 `token` 文件）。
 * Node strip-types 不支持装饰器语法，故用 Singleton()(class) 等价于 @Singleton()。
 */
const AuthToken = Singleton()(
  class AuthToken {
    /** 读取 token */
    toRead() {
      try {
        if (!existsSync(TOKEN_PATH)) return ''
        return readFileSync(TOKEN_PATH, 'utf-8').trim()
      } catch {
        return ''
      }
    }

    /** 写入 token */
    toUpdate(token: string) {
      writeFileSync(TOKEN_PATH, token, 'utf-8')
    }

    /** 清除 token */
    toRemove() {
      if (existsSync(TOKEN_PATH)) unlinkSync(TOKEN_PATH)
    }
  }
)

const authToken = new AuthToken()

export { AUTH_TOKEN_KEY, AuthToken, authToken }
