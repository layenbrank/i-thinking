import { database } from '@/database/slide-app.database.ts'
import { BaseModule } from '@/database/base.module.ts'
import type { SlideApp } from '@/types/slide-app.js'
import { Singleton } from '@desktop-widgets/core'

@Singleton()
export class SlideModule extends BaseModule<SlideApp, 'id'> {
	constructor() {
		super(database.slideApp)
	}
}

export const slideModule = new SlideModule()
