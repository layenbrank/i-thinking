import { database } from '@/database/database.ts'
import type { App, ObjectPlugin } from 'vue'

const preload: ObjectPlugin = {
  install(app: App) {
    database.open().catch(function (error) {
      console.error('打开数据库失败:', error)
    })
  }
}

export default preload
