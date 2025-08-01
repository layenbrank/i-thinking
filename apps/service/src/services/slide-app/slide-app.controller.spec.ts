import { Test, TestingModule } from '@nestjs/testing'
import { SlideAppController } from './slide-app.controller'
import { SlideAppService } from './slide-app.service'

describe('SlideAppController', () => {
	let controller: SlideAppController

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SlideAppController],
			providers: [SlideAppService]
		}).compile()

		controller = module.get<SlideAppController>(SlideAppController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})
})
