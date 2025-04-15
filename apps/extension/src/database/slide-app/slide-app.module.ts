import { database } from '@/database/slide-app.database.ts'
import { BaseModule } from '@/database/base.module.ts'
import type {} from './slide-app.entity.ts'
import type { SlideApp } from '@/types/slide-app.js'
import { Singleton } from '@desktop-widgets/core'

@Singleton()
export class SlideAppModule extends BaseModule<SlideApp, 'id'> {
  constructor() {
    super(database.slideApp)
  }
}

export const slideAppModule = new SlideAppModule()
