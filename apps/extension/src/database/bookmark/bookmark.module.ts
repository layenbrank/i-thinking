import { database } from '@/database/slide-app.database.ts'
import { BaseModule } from '@/database/base.module.ts'
import type { Bookmark } from './bookmark.entity'
import { Singleton } from '@desktop-widgets/core'

@Singleton()
export class BookmarkModule extends BaseModule<Bookmark, 'id'> {
  constructor() {
    super(database.bookmark)
  }
}

export const bookmarkModule = new BookmarkModule()
