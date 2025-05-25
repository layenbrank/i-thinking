import { database } from '@/database/slide-app.database.ts'
import { BaseModule } from '@/database/base.module.ts'
import { Singleton } from '@desktop-widgets/core'
import type { BookmarkFolder } from './folder.entity'

@Singleton()
export class FolderModule extends BaseModule<BookmarkFolder, 'id'> {
  constructor() {
    super(database.bookmarkFolder)
  }
}

export const folderModule = new FolderModule()
