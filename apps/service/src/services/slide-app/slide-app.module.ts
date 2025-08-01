import { Module } from '@nestjs/common'
import { SlideAppService } from './slide-app.service'
import { SlideAppController } from './slide-app.controller'

@Module({
	controllers: [SlideAppController],
	providers: [SlideAppService]
})
export class SlideAppModule {}
