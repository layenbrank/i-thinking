import { Module } from '@/decorators/module.decorator'
import { Dexie, type DBCore, type EntityTable, type Middleware } from 'dexie'
import { Singleton } from '@desktop-widgets/core'
import type { SlideApp } from '@/types/slide-app'
import type { Users } from './users/users.entity'

@Singleton()
export class AppDataBase extends Dexie {
  public slideApp!: EntityTable<SlideApp, 'id'>
  public users!: EntityTable<Users, 'id'>

  constructor() {
    super('apps')

    this.version(1).stores({
      slideApp: '&id,slideID,app,name,shape,size,downloadCount',
      users: '++id,name'
    })

    this.on('ready', async (db) => {
      if (!import.meta.env.DEV) return
      console.log('数据库已准备就绪，当前版本:', db.verno)
      for (const table of db.tables) {
        const count = await table.count()
        this.log(`${table.name}表记录数:`, count.toString())
      }
    })

    this.on('blocked', function () {
      if (!import.meta.env.DEV) return
      console.error('数据库被阻塞，请关闭其他使用此数据库的标签页')
    })

    this.on('versionchange', function () {})

    this.on('populate', function () {})

    addEventListener('unhandledrejection', function (event) {
      const reason = event.reason
      const msg = 'DatabaseClosedError'
      if (!reason) return
      if (!(reason.name === msg)) return
      alert('数据库异常关闭，请刷新页面')
    })
  }

  log(label: string, msg: string) {
    if (import.meta.env.DEV) {
      console.log(
        `%c ${label} ${msg}`,
        'background:#3B82FE; padding: 3px; padding-right: 8px; border-radius: 3px; color: #fff;'
      )
    }
  }
}

export const database = new AppDataBase()

database.open().catch((err) => console.error('打开数据库失败:', err))
