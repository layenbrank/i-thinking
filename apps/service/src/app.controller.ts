import { AppService } from '@/app.service'
import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
	constructor(private readonly service: AppService) {}

	@Get()
	toRead(): string {
		return this.service.toRead()
	}
}
